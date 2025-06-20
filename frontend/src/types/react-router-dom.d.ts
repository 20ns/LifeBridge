declare module 'react-router-dom' {
  import * as React from 'react';

  export interface BrowserRouterProps {
    children?: React.ReactNode;
    basename?: string;
  }
  export const BrowserRouter: React.FC<BrowserRouterProps>;

  export function useNavigate(): (path: string) => void;
  export function useLocation(): { pathname: string };
  export const Link: React.FC<{ to: string; className?: string; children?: React.ReactNode; 'aria-label'?: string }>;
} 