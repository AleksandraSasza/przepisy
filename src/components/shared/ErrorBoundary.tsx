'use client';

import { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Wystąpił błąd</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Coś poszło nie tak. Spróbuj odświeżyć stronę.
              </p>
              {this.state.error && (
                <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded">
                  {this.state.error.message}
                </p>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Odśwież stronę
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

