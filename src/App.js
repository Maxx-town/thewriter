import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const App = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Navigation state
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('projects');

  // Data state
  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Notification state
  const [notification, setNotification] = useState('');

  // Mock authentication
 const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) throw error;

    showNotification('ACCESS_GRANTED: Welcome back, Commander.');
    // The useEffect listener above will handle setting isAuthenticated(true)
  } catch (error) {
    console.error('Login error:', error);
    showNotification('ACCESS_DENIED: Invalid credentials.');
  } finally {
    setLoading(false);
  }
};


  // Fetch data from Supabase on authentication
useEffect(() => {
  // 1. Check active session on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    setIsAuthenticated(!!session);
    if (session) fetchData(); // Load data if logged in
  });

  // 2. Listen for changes (Login/Logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
    if (session) fetchData();
  });

  return () => subscription.unsubscribe();
}, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchProjects(), fetchPosts()]);
    setLoading(false);
  };

  // Fetch projects from Supabase
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showNotification('Error loading projects');
    }
  };

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showNotification('Error loading posts');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // CRUD Operations for Projects
  const createProject = async (data) => {
    try {
      const newProject = {
        ...data,
        order_index: projects.length + 1
      };

      const { error } = await supabase
        .from('projects')
        .insert([newProject]);

      if (error) throw error;

      showNotification('Project created successfully!');
      await fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      showNotification('Error creating project');
    }
  };

  const updateProject = async (id, data) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      showNotification('Project updated successfully!');
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      showNotification('Error updating project');
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification('Project deleted successfully!');
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification('Error deleting project');
    }
  };

  // CRUD Operations for Posts
  const createPost = async (data) => {
    try {
      const newPost = {
        ...data,
        published_date: data.is_published ? data.date : null,
        tags: data.tags || []
      };

      const { error } = await supabase
        .from('posts')
        .insert([newPost]);

      if (error) throw error;

      showNotification('Post created successfully!');
      await fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      showNotification('Error creating post');
    }
  };

  const updatePost = async (id, data) => {
  try {
    // 1. Destructure to remove fields that shouldn't be sent to the DB
    // We remove tags and date because they don't match your schema's column names
    const { 
      id: _id, 
      created_at, 
      updated_at, 
     // Removed because your current schema doesn't have it
      date, // We use published_date instead
      ...rest 
    } = data;

    const updateData = {
      ...rest,
      // Map 'is_published' (which exists) and 'published_date'
      is_published: !!data.is_published, 
      published_date: data.is_published ? (date || new Date().toISOString().split('T')[0]) : null
    };

    // 2. Perform the update
    const { error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    showNotification('Post updated successfully!');
    await fetchPosts();
  } catch (error) {
    console.error('Error updating post:', error);
    // This will alert you if the error is a 'Check Constraint' (e.g., Category 'ctf' not allowed)
    showNotification(`Update failed: ${error.message}`);
  }
};

  const deletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification('Post deleted successfully!');
      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('Error deleting post');
    }
  };

  const togglePublishStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    await updatePost(id, { 
      is_published: newStatus,
      published_date: newStatus ? new Date().toISOString().split('T')[0] : null
    });
  };

  // Editor handlers
  const openEditor = (item = null, type = 'projects') => {
    setIsEditing(!!item);
    setCurrentItem(item);
    setActiveTab(type);
    setCurrentView('editor');
    
    if (item) {
      setFormData(item);
    } else {
      if (type === 'projects') {
        setFormData({
          name: '',
          description: '',
          tech: '',
          github_url: '',
          demo_url: '',
          image_url: ''
        });
      } else {
        setFormData({
          title: '',
          excerpt: '',
          content: '',
          category: 'tech',
          date: new Date().toISOString().split('T')[0],
          is_published: false,
          tags: []
        });
      }
    }
  };

  const handleSave = async () => {
    if (activeTab === 'projects') {
      if (currentItem) {
        await updateProject(currentItem.id, formData);
      } else {
        await createProject(formData);
      }
    } else {
      if (currentItem) {
        await updatePost(currentItem.id, formData);
      } else {
        await createPost(formData);
      }
    }
    setCurrentView('dashboard');
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({});
  };

  const handleCancel = () => {
    setCurrentView('dashboard');
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({});
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <style>{cssStyles}</style>
        <div style={styles.loginBox}>
          <div style={styles.loginHeader}>
            <div style={styles.terminalIcon}>▊</div>
            <h1 style={styles.loginTitle}>COSMIC TERMINAL ADMIN</h1>
          </div>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>EMAIL_ID</label>
              <input
                type="email"
                autocomplete="off"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                style={styles.input}
                placeholder="admin"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>PASSWORD</label>
              <input
                type="password"
                autocomplete="new password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                style={styles.input}
                placeholder="••••••"
              />
            </div>
            <button type="submit" style={styles.loginButton}>
              AUTHENTICATE →
            </button>
          </form>
          <p style={styles.loginHint}>Hint: admin / admin</p>
        </div>
        {notification && (
          <div style={styles.notification}>{notification}</div>
        )}
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.container}>
      <style>{cssStyles}</style>
      
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.terminalIcon}>▊</div>
          <h2 style={styles.sidebarTitle}>ADMIN</h2>
        </div>
        <nav style={styles.nav}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              ...styles.navButton,
              ...(currentView === 'dashboard' ? styles.navButtonActive : {})
            }}
          >
            <span style={styles.navIcon}>▣</span> Dashboard
          </button>
          <button
            onClick={() => openEditor(null, 'projects')}
            style={styles.navButton}
          >
            <span style={styles.navIcon}>+</span> New Project
          </button>
          <button
            onClick={() => openEditor(null, 'posts')}
            style={styles.navButton}
          >
            <span style={styles.navIcon}>+</span> New Post
          </button>
          <button
          onClick={async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    showNotification('SESSION_TERMINATED: Logged out.');
  }}
            style={styles.navButton}
          >
            <span style={styles.navIcon}>⎋</span> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>
            {currentView === 'dashboard' ? 'Content Management' : isEditing ? 'Edit Item' : 'Create New Item'}
          </h1>
        </header>

        <div style={styles.content}>
          {notification && (
            <div style={styles.notification}>{notification}</div>
          )}

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>LOADING_DATA...</div>
            </div>
          ) : currentView === 'dashboard' ? (
            <>
              {/* Tab Navigation */}
              <div style={styles.tabs}>
                <button
                  onClick={() => setActiveTab('projects')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'projects' ? styles.tabActive : {})
                  }}
                >
                  Projects ({projects.length})
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'posts' ? styles.tabActive : {})
                  }}
                >
                  Blog Posts ({posts.length})
                </button>
              </div>

              {/* Projects Table */}
              {activeTab === 'projects' && (
                <div style={styles.tableContainer}>
                  {projects.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>No projects yet. Create your first project!</p>
                      <button onClick={() => openEditor(null, 'projects')} style={styles.primaryButton}>
                        + New Project
                      </button>
                    </div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Tech Stack</th>
                          <th style={styles.th}>Links</th>
                          <th style={styles.th}>Order</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map(project => (
                          <tr key={project.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.cellTitle}>{project.name}</div>
                              <div style={styles.cellSubtitle}>{project.description}</div>
                            </td>
                            <td style={styles.td}>{project.tech}</td>
                            <td style={styles.td}>
                              <div style={styles.linkGroup}>
                                {project.github_url && <span style={styles.badge}>GitHub</span>}
                                {project.demo_url && <span style={styles.badge}>Demo</span>}
                              </div>
                            </td>
                            <td style={styles.td}>{project.order_index}</td>
                            <td style={styles.td}>
                              <div style={styles.actionButtons}>
                                <button
                                  onClick={() => openEditor(project, 'projects')}
                                  style={styles.editButton}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteProject(project.id)}
                                  style={styles.deleteButton}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Posts Table */}
              {activeTab === 'posts' && (
                <div style={styles.tableContainer}>
                  {posts.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>No blog posts yet. Create your first post!</p>
                      <button onClick={() => openEditor(null, 'posts')} style={styles.primaryButton}>
                        + New Post
                      </button>
                    </div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Title</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map(post => (
                          <tr key={post.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.cellTitle}>{post.title}</div>
                              <div style={styles.cellSubtitle}>{post.excerpt}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.categoryBadge}>{post.category}</span>
                            </td>
                            <td style={styles.td}>{post.date}</td>
                            <td style={styles.td}>
                              <button
                                onClick={() => togglePublishStatus(post.id, post.is_published)}
                                style={{
                                  ...styles.statusBadge,
                                  ...(post.is_published ? styles.statusPublished : styles.statusDraft)
                                }}
                              >
                                {post.is_published ? 'Published' : 'Draft'}
                              </button>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actionButtons}>
                                <button
                                  onClick={() => openEditor(post, 'posts')}
                                  style={styles.editButton}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deletePost(post.id)}
                                  style={styles.deleteButton}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Editor View */
            <div style={styles.editor}>
              <div style={styles.editorHeader}>
                <h2 style={styles.editorTitle}>
                  {isEditing ? `Edit ${activeTab === 'projects' ? 'Project' : 'Post'}` : `New ${activeTab === 'projects' ? 'Project' : 'Post'}`}
                </h2>
              </div>

              {activeTab === 'projects' ? (
                <div style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Project Name *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={styles.formInput}
                      placeholder="Quantum Compiler"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Description *</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={styles.formTextarea}
                      rows="3"
                      placeholder="A brief description of your project"
                    />
                  </div>

               {/* REPLACES THE OLD TECH STACK DIV */}
                  <div style={styles.formRow}>
                    <div style={{ ...styles.formGroup, flex: 3 }}>
                      <label style={styles.formLabel}>Tech Stack *</label>
                      <input
                        type="text"
                        value={formData.tech || ''}
                        onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
                        style={styles.formInput}
                        placeholder="React, Node.js, MongoDB"
                      />
                    </div>

                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.formLabel}>Order</label>
                      <input
                        type="number"
                        value={formData.order_index || ''}
                        onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                        style={styles.formInput}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>GitHub URL</label>
                      <input
                        type="url"
                        value={formData.github_url || ''}
                        onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                        style={styles.formInput}
                        placeholder="https://github.com/username/repo"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Demo URL</label>
                      <input
                        type="url"
                        value={formData.demo_url || ''}
                        onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                        style={styles.formInput}
                        placeholder="https://demo.example.com"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Image URL</label>
                    <input
                      type="url"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      style={styles.formInput}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              ) : (
                <div style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Title *</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      style={styles.formInput}
                      placeholder="Your Amazing Blog Post Title"
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Category *</label>
                      <select
                        value={formData.category || 'tech'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={styles.formSelect}
                      >
                        <option value="tech">Tech</option>
                        <option value="travel">Travel</option>
                        <option value="reviews">Reviews</option>
                        <option value="ctf">CTF</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Date *</label>
                      <input
                        type="date"
                        value={formData.date || ''}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Excerpt *</label>
                    <textarea
                      value={formData.excerpt || ''}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      style={styles.formTextarea}
                      rows="2"
                      placeholder="A short excerpt that appears in the list view"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Content *</label>
                    <textarea
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      style={styles.formTextarea}
                      rows="10"
                      placeholder="Full content of your blog post (Markdown supported)"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      })}
                      style={styles.formInput}
                      placeholder="react, javascript, tutorial"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.is_published || false}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        style={styles.checkbox}
                      />
                      Publish immediately
                    </label>
                  </div>
                </div>
              )}

              <div style={styles.editorActions}>
                <button onClick={handleCancel} style={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={handleSave} style={styles.saveButton}>
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Styles object
const styles = {
  loginContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Courier New', monospace",
    padding: '20px',
  },
  loginBox: {
    background: '#000',
    border: '2px solid #fff',
    borderRadius: '8px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  loginHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  terminalIcon: {
    fontSize: '24px',
    color: '#fff',
  },
  loginTitle: {
    fontSize: '20px',
    color: '#fff',
    margin: 0,
    letterSpacing: '2px',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: '#9ca3af',
    letterSpacing: '1px',
  },
  input: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    padding: '12px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  loginButton: {
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '1px',
    transition: 'all 0.3s',
    marginTop: '8px',
  },
  loginHint: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#6b7280',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Courier New', monospace",
  },
  sidebar: {
    width: '260px',
    background: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: '18px',
    margin: 0,
    letterSpacing: '2px',
  },
  nav: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navButton: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '12px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navButtonActive: {
    background: '#334155',
    color: '#fff',
  },
  navIcon: {
    fontSize: '16px',
  },
  main: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '24px 32px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: '24px',
    margin: 0,
    color: '#1e293b',
  },
  content: {
    padding: '32px',
    flex: 1,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#64748b',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#000',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    zIndex: 1000,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.3s ease',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
    color: '#2563eb',
    fontWeight: 'bold',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    background: '#f8fafc',
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1e293b',
  },
  cellTitle: {
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  cellSubtitle: {
    fontSize: '12px',
    color: '#64748b',
  },
  linkGroup: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  categoryBadge: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusBadge: {
    border: 'none',
    padding: '6px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statusPublished: {
    background: '#dcfce7',
    color: '#166534',
  },
  statusDraft: {
    background: '#fef3c7',
    color: '#92400e',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  deleteButton: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  emptyState: {
    padding: '64px 32px',
    textAlign: 'center',
    color: '#64748b',
  },
  primaryButton: {
    marginTop: '16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  editor: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '32px',
  },
  editorHeader: {
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  editorTitle: {
    fontSize: '20px',
    margin: 0,
    color: '#1e293b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: 'bold',
    letterSpacing: '0.3px',
  },
  formInput: {
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formTextarea: {
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
  },
  formSelect: {
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    background: '#fff',
    cursor: 'pointer',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#475569',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  editorActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelButton: {
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  },
  saveButton: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  },
};

const cssStyles = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  input:focus, textarea:focus, select:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  table tr:hover {
    background: #f8fafc;
  }

  @media (max-width: 768px) {
    aside {
      display: none;
    }
    main {
      margin-left: 0;
    }
  }
`;

export default App;