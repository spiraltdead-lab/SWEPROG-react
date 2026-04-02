import create from 'zustand';

type AuthState = {
  isAuthenticated: boolean;
  user: null | object;
  logIn: (user: object) => void;
  logOut: () => void;
};

const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  logIn: (user) => set({ isAuthenticated: true, user }),
  logOut: () => set({ isAuthenticated: false, user: null }),
}));

export default useAuth;