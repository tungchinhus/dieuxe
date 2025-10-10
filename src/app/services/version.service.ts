import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private readonly VERSION_KEY = 'app_version';
  private readonly BUILD_KEY = 'app_build';

  constructor() {}

  /**
   * Lấy version hiện tại
   */
  getCurrentVersion(): string {
    const version = localStorage.getItem(this.VERSION_KEY) || '1.0.0';
    return version;
  }

  /**
   * Lấy build number hiện tại
   */
  getCurrentBuild(): number {
    const build = localStorage.getItem(this.BUILD_KEY);
    return build ? parseInt(build, 10) : 26;
  }

  /**
   * Tăng build number
   */
  incrementBuild(): number {
    const currentBuild = this.getCurrentBuild();
    const newBuild = currentBuild + 1;
    localStorage.setItem(this.BUILD_KEY, newBuild.toString());
    return newBuild;
  }

  /**
   * Lấy version string đầy đủ
   */
  getFullVersion(): string {
    const version = this.getCurrentVersion();
    const build = this.getCurrentBuild();
    return `${version} (Build ${build})`;
  }

  /**
   * Lấy build info cho hiển thị
   */
  getBuildInfo(): string {
    const build = this.getCurrentBuild();
    const deployDate = new Date().toLocaleDateString('vi-VN');
    return `Version Build: ${build} - ${deployDate}`;
  }

  /**
   * Reset version (dùng cho testing)
   */
  resetVersion(): void {
    localStorage.removeItem(this.VERSION_KEY);
    localStorage.removeItem(this.BUILD_KEY);
  }
}
