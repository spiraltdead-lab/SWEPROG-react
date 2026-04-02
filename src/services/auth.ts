// src/services/auth.ts

class AuthService {
    private static tokenKey = 'auth_token';

    static login(token: string) {
        localStorage.setItem(this.tokenKey, token);
    }

    static logout() {
        localStorage.removeItem(this.tokenKey);
    }

    static getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    static isLoggedIn(): boolean {
        return this.getToken() !== null;
    }
}

export default AuthService;