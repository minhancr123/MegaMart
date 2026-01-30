// Polyfill findDOMNode cho React 19
// React Quill 1.3.5 cần findDOMNode nhưng API này đã bị remove trong React 19

if (typeof window !== 'undefined') {
    // @ts-ignore
    import('react-dom').then((ReactDOM) => {
        // Polyfill function
        const findDOMNode = (node: any): HTMLElement | null => {
            if (node == null) {
                return null;
            }
            
            // If already a DOM node
            if (node instanceof HTMLElement) {
                return node;
            }
            
            // Try to get DOM node from React component instance
            if (node.nodeType === 1) {
                return node;
            }
            
            // For React 19, try to access internal fiber
            const fiber = (node as any)._reactInternals || (node as any)._reactInternalFiber;
            if (fiber && fiber.stateNode instanceof HTMLElement) {
                return fiber.stateNode;
            }
            
            // Last resort - try common properties
            if (node.stateNode instanceof HTMLElement) {
                return node.stateNode;
            }
            
            if (node._hostNode instanceof HTMLElement) {
                return node._hostNode;
            }
            
            return null;
        };
        
        // Try to add to ReactDOM using defineProperty
        try {
            Object.defineProperty(ReactDOM, 'findDOMNode', {
                value: findDOMNode,
                writable: false,
                configurable: true,
                enumerable: false
            });
        } catch (e) {
            // If defineProperty fails, try direct assignment (may still fail if sealed)
            try {
                (ReactDOM as any).findDOMNode = findDOMNode;
            } catch (err) {
                console.warn('Could not polyfill ReactDOM.findDOMNode for React 19');
            }
        }
        
        // Also add to global for fallback
        (window as any).ReactDOM_findDOMNode = findDOMNode;
    });
}

export {};
