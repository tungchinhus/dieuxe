import { Injectable } from '@angular/core';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  Firestore,
  getFirestore
} from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouteDetail, RouteDetailCreate, RouteDetailUpdate } from '../models/route-detail.model';
import { app } from '../../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class RouteDetailService {
  private collectionName = 'chiTietTuyenDuong';
  private firestore: Firestore;

  constructor() {
    this.firestore = getFirestore(app);
  }

  /**
   * Get all route details
   * @returns Observable of route details array
   */
  getRouteDetails(): Observable<RouteDetail[]> {
    console.log('Loading all route details from Firebase collection:', this.collectionName);
    const routeDetailsRef = collection(this.firestore, this.collectionName);
    return from(getDocs(routeDetailsRef)).pipe(
      map(snapshot => {
        console.log('Total documents found:', snapshot.docs.length);
        const results = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          console.log('Document ID:', doc.id, 'Data:', data);
          return {
            id: doc.id,
            ...data
          } as RouteDetail;
        });
        console.log('All route details loaded:', results);
        return results;
      })
    );
  }

  /**
   * Get route details by route code
   * @param routeCode - Route code to filter by
   * @returns Observable of route details array
   */
  getRouteDetailsByRoute(routeCode: string): Observable<RouteDetail[]> {
    console.log('Querying stations for route:', routeCode);
    const routeDetailsRef = collection(this.firestore, this.collectionName);
    const q = query(routeDetailsRef, where('maTuyenXe', '==', routeCode), orderBy('thuTu', 'asc'));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        console.log('Query result for route', routeCode, ':', snapshot.docs.length, 'documents found');
        const results = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          console.log('Station document:', doc.id, 'Data:', data);
          return {
            id: doc.id,
            ...data
          } as RouteDetail;
        });
        console.log('Filtered stations for route', routeCode, ':', results);
        return results;
      })
    );
  }

  /**
   * Add a new route detail
   * @param routeDetail - Route detail to add
   * @returns Promise with document reference
   */
  async addRouteDetail(routeDetail: RouteDetailCreate): Promise<any> {
    try {
      // Generate a unique maChiTiet
      const maChiTiet = await this.generateNextMaChiTiet();
      
      const routeDetailsRef = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(routeDetailsRef, {
        ...routeDetail,
        maChiTiet: maChiTiet,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef;
    } catch (error) {
      console.error('Error adding route detail:', error);
      throw error;
    }
  }

  /**
   * Update an existing route detail
   * @param id - Document ID
   * @param routeDetail - Updated route detail data
   * @returns Promise
   */
  async updateRouteDetail(id: string, routeDetail: RouteDetailUpdate): Promise<void> {
    try {
      const routeDetailRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(routeDetailRef, {
        ...routeDetail,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating route detail:', error);
      throw error;
    }
  }

  /**
   * Delete a route detail
   * @param id - Document ID
   * @returns Promise
   */
  async deleteRouteDetail(id: string): Promise<void> {
    try {
      const routeDetailRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(routeDetailRef);
    } catch (error) {
      console.error('Error deleting route detail:', error);
      throw error;
    }
  }

  /**
   * Delete multiple route details
   * @param ids - Array of document IDs
   * @returns Promise
   */
  async deleteMultipleRouteDetails(ids: string[]): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      ids.forEach(id => {
        const routeDetailRef = doc(this.firestore, this.collectionName, id);
        batch.delete(routeDetailRef);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error deleting multiple route details:', error);
      throw error;
    }
  }

  /**
   * Add multiple route details (for Excel import)
   * @param routeDetails - Array of route details to add
   * @returns Promise
   */
  async addMultipleRouteDetails(routeDetails: RouteDetailCreate[]): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      const timestamp = new Date();
      
      // Get the next available maChiTiet
      const nextMaChiTiet = await this.generateNextMaChiTiet();
      
      routeDetails.forEach((routeDetail, index) => {
        const routeDetailsRef = collection(this.firestore, this.collectionName);
        const docRef = doc(routeDetailsRef);
        batch.set(docRef, {
          ...routeDetail,
          maChiTiet: nextMaChiTiet + index,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error adding multiple route details:', error);
      throw error;
    }
  }

  /**
   * Generate next available maChiTiet
   * @returns Promise with next maChiTiet number
   */
  private async generateNextMaChiTiet(): Promise<number> {
    try {
      const routeDetailsRef = collection(this.firestore, this.collectionName);
      const q = query(routeDetailsRef, orderBy('maChiTiet', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return 1;
      }
      
      const lastDoc = snapshot.docs[0];
      const lastMaChiTiet = lastDoc.data()['maChiTiet'] || 0;
      return lastMaChiTiet + 1;
    } catch (error) {
      console.error('Error generating next maChiTiet:', error);
      return 1;
    }
  }

  /**
   * Get route details count
   * @returns Observable of count
   */
  getRouteDetailsCount(): Observable<number> {
    return this.getRouteDetails().pipe(
      map(routeDetails => routeDetails.length)
    );
  }

  /**
   * Search route details by stop name
   * @param searchTerm - Search term
   * @returns Observable of route details array
   */
  searchRouteDetails(searchTerm: string): Observable<RouteDetail[]> {
    const routeDetailsRef = collection(this.firestore, this.collectionName);
    const q = query(routeDetailsRef, 
      where('tenDiemDon', '>=', searchTerm),
      where('tenDiemDon', '<=', searchTerm + '\uf8ff')
    );
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as RouteDetail)))
    );
  }
}