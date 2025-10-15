// Simple authentication utility
const CREDENTIALS = {
  email: "info.pravas.cs@gmail.com",
  password: "quasarseo1234"
};

const SESSION_KEY = "quasarleads_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface AuthSession {
  isAuthenticated: boolean;
  loginTime: number;
  expiresAt: number;
  userEmail?: string;
  userId?: string;
  username?: string;
  admin?: boolean;
  verified?: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  verified?: boolean;
  admin?: boolean;
}

export interface SignupResult {
  success: boolean;
  error?: string;
  user?: any;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: any;
}

export const auth = {
  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    
    const session = this.getSession();
    if (!session) return false;
    
    const now = Date.now();
    if (now > session.expiresAt) {
      this.logout();
      return false;
    }
    
    return session.isAuthenticated;
  },

  // Update local session email after successful change
  updateSessionEmail(newEmail: string): void {
    if (typeof window === "undefined") return;
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return;
      const session: AuthSession = JSON.parse(sessionData);
      session.userEmail = newEmail;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  },

  // Signup with new user credentials
  async signup(username: string, email: string, password: string): Promise<SignupResult> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Signup failed'
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'Network error during signup'
      };
    }
  },

  // Login with credentials (updated to work with database)
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Create session
        const now = Date.now();
        const session: AuthSession = {
          isAuthenticated: true,
          loginTime: now,
          expiresAt: now + SESSION_DURATION,
          userEmail: data.user.email,
          userId: data.user._id,
          username: data.user.username,
          admin: Boolean(data.user.admin),
          verified: Boolean(data.user.verified)
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error during login'
      };
    }
  },

  // Get current user information from database
  async getCurrentUserFromDB(): Promise<CurrentUser | null> {
    try {
      const session = this.getSession();
      if (!session || !session.isAuthenticated) return null;

      const response = await fetch(`/api/auth/me?userId=${session.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      } else {
        // Fallback to session data if API fails
        return {
          id: session.userId || "quasar-admin",
          email: session.userEmail || CREDENTIALS.email,
          username: session.username || "QuasarAdmin"
        };
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to session data
      const session = this.getSession();
      if (!session || !session.isAuthenticated) return null;
      
      return {
        id: session.userId || "quasar-admin",
        email: session.userEmail || CREDENTIALS.email,
        username: session.username || "QuasarAdmin"
      };
    }
  },

  // Get current user ID (for API calls)
  async getCurrentUserId(): Promise<string | null> {
    try {
      const user = await this.getCurrentUserFromDB();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      const session = this.getSession();
      // Fallback to your user ID if session doesn't have one
      return session?.userId || "6894ec696cbf2dda14db1b96";
    }
  },

  // Get authentication header for API requests
  getAuthHeader(): string | null {
    const session = this.getSession();
    if (!session || !session.isAuthenticated) return null;
    
    return `Bearer ${session.userId}`;
  },

  // Get current user information (legacy method - uses session only)
  getCurrentUser(): CurrentUser | null {
    const session = this.getSession();
    if (!session || !session.isAuthenticated) return null;
    
    return {
      id: session.userId || "quasar-admin",
      email: session.userEmail || CREDENTIALS.email,
      username: session.username || "QuasarAdmin",
      // @ts-ignore add admin/verified if present
      admin: session.admin,
      verified: session.verified
    };
  },

  // Logout user
  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
  },

  // Get current session
  getSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch {
      return null;
    }
  },

  // Get remaining session time in hours
  getRemainingTime(): number {
    const session = this.getSession();
    if (!session) return 0;
    
    const now = Date.now();
    const remaining = session.expiresAt - now;
    
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
  }
}; 