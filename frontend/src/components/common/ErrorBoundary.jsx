import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('EssentialSupermarket UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="page-error"><h2>Something went wrong</h2><p>Refresh the page and try again.</p><button className="secondary-btn" onClick={() => window.location.reload()}>Refresh page</button></div>;
    }
    return this.props.children;
  }
}