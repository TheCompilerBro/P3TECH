import { useState, useEffect } from 'react'
import { FileCode, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import Editor from '@monaco-editor/react'
import './CodeExplorer.css'

function CodeExplorer({ data, initialFilePath }) {
  const [selectedFile, setSelectedFile] = useState(data?.codeFiles?.[0])
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src']))

  // Auto-select file when navigating from Learning Path
  useEffect(() => {
    if (initialFilePath && data?.codeFiles) {
      const fileToSelect = data.codeFiles.find(f => f.path === initialFilePath)
      if (fileToSelect) {
        setSelectedFile(fileToSelect)
        // Auto-expand parent folders
        const pathParts = initialFilePath.split('/')
        const newExpanded = new Set(expandedFolders)
        pathParts.forEach((_, index) => {
          const folderPath = pathParts.slice(0, index + 1).join('/')
          newExpanded.add(folderPath)
        })
        setExpandedFolders(newExpanded)
      }
    }
  }, [initialFilePath, data])

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderName)) {
        next.delete(folderName)
      } else {
        next.add(folderName)
      }
      return next
    })
  }

  // Mock code content for prototype
  const getCodeContent = (file) => {
    // First check if we have actual uploaded file content
    if (data?.fileContents && data.fileContents[file?.name]) {
      return data.fileContents[file.name]
    }

    // Also check if the file has content stored directly
    if (file?.content) {
      return file.content
    }

    // Fall back to mock code for GitHub URLs
    const mockCode = {
      'App.jsx': `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;`,
      'index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Initialize application
const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}`,
      'api.js': `import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getUser = () => api.get('/user');
export const updateUser = (data) => api.put('/user', data);
export const login = (credentials) => api.post('/auth/login', credentials);

export default api;`,
      'auth.js': `/**
 * Authentication utilities
 * Handles user login, logout, and token management
 */

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';

export const auth = {
  // Store authentication token
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Retrieve authentication token
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Remove authentication token
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    // Check token expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  // Store user data
  setUser(userData) {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  },

  // Get user data
  getUser() {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Logout user
  logout() {
    this.removeToken();
    window.location.href = '/login';
  }
};

export default auth;`,
      'UserProfile.jsx': `import React, { useState, useEffect } from 'react';
import { getUser, updateUser } from '../services/api';
import './UserProfile.css';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await getUser();
      setUser(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(formData);
      setUser(formData);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {editing ? (
        <form onSubmit={handleSubmit}>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Name"
          />
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
          />
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Bio"
          />
          <button type="submit">Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div className="profile-view">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Bio:</strong> {user.bio}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;`
    }
    return mockCode[file?.name] || `// ${file?.name}\n// File content is available after repository analysis.\n\nexport default {};`
  }

  // Build hierarchical folder structure from flat file list
  const buildFileTree = (files) => {
    const tree = {}

    files.forEach(file => {
      const parts = file.path.split('/')
      let current = tree

      // Build folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const folder = parts[i]
        if (!current[folder]) {
          current[folder] = { _isFolder: true, _children: {} }
        }
        current = current[folder]._children
      }

      // Add file
      const fileName = parts[parts.length - 1]
      current[fileName] = { _isFolder: false, _file: file }
    })

    return tree
  }

  const fileTree = buildFileTree(data?.codeFiles || [])

  return (
    <div className="code-explorer">
      <div className="explorer-layout">
        {/* File Tree Sidebar */}
        <div className="file-tree card">
          <div className="tree-header">
            <h4>Files</h4>
            <span className="file-count">{data?.structure?.files || 0} files</span>
          </div>
          <div className="tree-content">
            <FileTreeNode
              name="root"
              node={fileTree}
              path=""
              level={0}
              expanded={expandedFolders}
              onToggle={toggleFolder}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* Code Viewer */}
        <div className="code-viewer card">
          {selectedFile ? (
            <>
              <div className="viewer-header">
                <div className="file-info">
                  <FileCode size={18} className="file-icon" />
                  <span className="file-path">{selectedFile.path}</span>
                </div>
                <div className="file-meta">
                  <span className="badge">{selectedFile.type}</span>
                  <span className="text-muted">{selectedFile.lines} lines</span>
                </div>
              </div>
              <div className="editor-container">
                <Editor
                  height="500px"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={getCodeContent(selectedFile)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
              {/* AI Explanation */}
              <div className="ai-explanation">
                <div className="explanation-header">
                  <span className="ai-badge">🤖 AI Explanation</span>
                </div>
                <p className="text-muted">
                  {getAIExplanation(selectedFile)}
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <FileCode size={48} className="text-muted" />
              <p className="text-muted">Select a file to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Recursive File Tree Node Component (VS Code style)
function FileTreeNode({ name, node, path, level, expanded, onToggle, onFileSelect, selectedFile }) {
  if (!node) return null

  const entries = Object.entries(node).filter(([key]) => !key.startsWith('_'))

  return (
    <>
      {entries.map(([key, value]) => {
        const currentPath = path ? `${path}/${key}` : key
        const isExpanded = expanded.has(currentPath)

        if (value._isFolder) {
          return (
            <div key={currentPath} className="tree-folder">
              <div
                className="folder-header"
                onClick={() => onToggle(currentPath)}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                <span>{key}</span>
              </div>
              {isExpanded && (
                <FileTreeNode
                  name={key}
                  node={value._children}
                  path={currentPath}
                  level={level + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                />
              )}
            </div>
          )
        } else {
          // File
          const file = value._file
          const isSelected = selectedFile?.path === file?.path

          return (
            <div
              key={currentPath}
              className={`file-item ${isSelected ? 'active' : ''}`}
              onClick={() => onFileSelect(file)}
              style={{ paddingLeft: `${level * 12 + 28}px` }}
            >
              <FileCode size={14} />
              <span>{key}</span>
            </div>
          )
        }
      })}
    </>
  )
}

function getAIExplanation(file) {
  // Generate explanation based on actual file content
  if (file?.content) {
    const content = file.content.toLowerCase()
    const lines = file.content.split('\n')

    // Analyze imports/dependencies
    const hasReact = content.includes('react')
    const hasExpress = content.includes('express')
    const hasAxios = content.includes('axios')
    const hasMongo = content.includes('mongoose') || content.includes('mongodb')

    // Analyze patterns
    const hasUseState = content.includes('usestate')
    const hasUseEffect = content.includes('useeffect')
    const hasAsync = content.includes('async')
    const hasAPI = content.includes('api') || content.includes('fetch') || hasAxios
    const hasRoutes = content.includes('route') || content.includes('router')
    const hasAuth = content.includes('auth') || content.includes('token')

    // Build intelligent explanation
    let explanation = `This is a ${file.type} file`

    if (hasReact) {
      explanation += ' that uses React for UI rendering'
      if (hasUseState || hasUseEffect) {
        explanation += ' with hooks for state management'
      }
    } else if (hasExpress) {
      explanation += ' for Express.js server configuration'
    }

    if (hasAPI) {
      explanation += '. It handles API communication'
      if (hasAxios) explanation += ' using Axios'
      if (hasAsync) explanation += ' with async/await patterns'
    }

    if (hasRoutes) {
      explanation += '. Manages application routing and navigation'
    }

    if (hasAuth) {
      explanation += '. Includes authentication logic and token handling'
    }

    if (hasMongo) {
      explanation += '. Handles database operations with MongoDB'
    }

    explanation += `. Contains ${file.lines} lines of code.`

    return explanation
  }

  // Fallback explanations
  const explanations = {
    'App.jsx': 'This is the main application component that sets up routing using React Router. It defines the overall layout with a Header component and routes for Home and Profile pages.',
    'api.js': 'This module creates an Axios instance configured with the API base URL and automatic JWT token injection for authenticated requests.',
    'auth.js': 'Authentication utility that handles user login, token storage, and session management.',
    'UserProfile.jsx': 'Component that displays user profile information and handles profile updates.',
    'index.js': 'Application entry point that renders the App component into the DOM.'
  }
  return explanations[file.name] || 'This file contains important application logic. Click through the code to understand its structure.'
}

export default CodeExplorer
