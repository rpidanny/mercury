import { ReactNode } from 'react';
import { AppProvider } from '../context/AppContext';

// Helper type for component props
type TestWrapperProps = {
  children: ReactNode;
};

// TestWrapper component for tests
export const TestWrapper = ({ children }: TestWrapperProps) => (
  <AppProvider>
    {children}
  </AppProvider>
);

export default TestWrapper; 