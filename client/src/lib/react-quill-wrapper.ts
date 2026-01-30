// Custom React Quill wrapper cho React 19
// Giải quyết vấn đề findDOMNode không tồn tại

// Polyfill findDOMNode trước khi import React Quill
if (typeof window !== 'undefined') {
    try {
        const ReactDOM = require('react-dom');
        
        if (!ReactDOM.findDOMNode) {
            ReactDOM.findDOMNode = function findDOMNode(node: any): HTMLElement | null {
                if (node == null) return null;
                if (node instanceof HTMLElement) return node;
                if (node.nodeType === 1) return node;
                
                // React 19 internal fiber
                const fiber = node._reactInternals || node._reactInternalFiber;
                if (fiber?.stateNode instanceof HTMLElement) {
                    return fiber.stateNode;
                }
                
                if (node.stateNode instanceof HTMLElement) {
                    return node.stateNode;
                }
                
                return null;
            };
        }
    } catch (e) {
        console.warn('Could not polyfill ReactDOM.findDOMNode:', e);
    }
}

// Now safely import and export React Quill
export { default } from 'react-quill';
