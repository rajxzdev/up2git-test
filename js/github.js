/**
 * GitHub API Wrapper Module
 * Handles Authentication, Repository Management, and Content Uploads via REST API.
 */

class GitHubAPI {
  constructor() {
    this.sessionKey = 'gh_pat_token';
    this.userDataKey = 'gh_user_data';
  }

  /**
   * Get stored token from sessionStorage
   */
  getToken() {
    return sessionStorage.getItem(this.sessionKey);
  }

  /**
   * Save token to sessionStorage
   */
  setToken(token) {
    sessionStorage.setItem(this.sessionKey, token.trim());
  }

  /**
   * Remove token and user data from sessionStorage
   */
  logout() {
    sessionStorage.removeItem(this.sessionKey);
    sessionStorage.removeItem(this.userDataKey);
  }

  /**
   * Get cached user profile data
   */
  getCachedUser() {
    const data = sessionStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Helper to build request headers
   */
  _getHeaders(customToken = null) {
    const token = customToken || this.getToken();
    if (!token) throw new Error("GitHub Token tidak ditemukan. Silakan login kembali.");
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate token by fetching current authenticated user
   * GET https://api.github.com/user
   */
  async validateToken(token) {
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: this._getHeaders(token)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Personal Access Token tidak valid atau kadaluwarsa.");
      }
      throw new Error(`Gagal memvalidasi token: ${response.statusText}`);
    }

    const userData = await response.json();
    this.setToken(token);
    sessionStorage.setItem(this.userDataKey, JSON.stringify(userData));
    return userData;
  }

  /**
   * Fetch user repositories (public & private if scope permits)
   * GET https://api.github.com/user/repos?per_page=100
   */
  async getRepositories() {
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      method: 'GET',
      headers: this._getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil daftar repository: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a new GitHub repository
   * POST https://api.github.com/user/repos
   */
  async createRepository(name, description, isPrivate) {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        private: Boolean(isPrivate)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.message || response.statusText;
      throw new Error(`Gagal membuat repo: ${errorMsg}`);
    }

    return data;
  }

  /**
   * Check if a file already exists in repository to obtain its SHA
   * GET https://api.github.com/repos/{owner}/{repo}/contents/{path}
   */
  async getFileSha(owner, repo, path) {
    try {
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'GET',
        headers: this._getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data.sha;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Upload or update a single file in GitHub repository
   * PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}
   */
  async uploadFile(owner, repo, path, base64Content, commitMessage, existingSha = null) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

    const payload = {
      message: commitMessage || "Upload via up2git",
      content: base64Content
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: this._getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  }
}

window.githubAPI = new GitHubAPI();
