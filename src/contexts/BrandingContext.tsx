import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface BrandingContextType {
  appName: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const DEFAULT_APP_NAME = 'WorkOS';
const DEFAULT_PRIMARY_COLOR = '#6366f1';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { currentOrganization } = useAuth();

  // Derived branding values
  const appName = currentOrganization?.app_name || DEFAULT_APP_NAME;
  const logoUrl = currentOrganization?.logo_url || null;
  const primaryColor = currentOrganization?.primary_color || DEFAULT_PRIMARY_COLOR;
  const faviconUrl = currentOrganization?.favicon_url || null;

  // Update document title when org changes
  useEffect(() => {
    document.title = appName;
  }, [appName]);

  // Update favicon when org changes
  useEffect(() => {
    if (faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [faviconUrl]);

  // Update CSS custom properties for branding color
  useEffect(() => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
      };
    };

    const hsl = hexToHSL(primaryColor);
    if (hsl) {
      const hslValue = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      
      // Update all primary-related CSS variables used by Tailwind
      root.style.setProperty('--primary', hslValue);
      root.style.setProperty('--ring', hslValue);
      root.style.setProperty('--sidebar-primary', hslValue);
      root.style.setProperty('--sidebar-ring', hslValue);
    }

    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    };
  }, [primaryColor]);

  return (
    <BrandingContext.Provider
      value={{
        appName,
        logoUrl,
        primaryColor,
        faviconUrl,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
