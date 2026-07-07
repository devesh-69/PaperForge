import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const NavBar: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-lg app-navbar">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <span className="brand-dot" />
          PaperForge
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <i className="bi bi-list fs-4" style={{ color: 'var(--black)' }}></i>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto gap-1 py-2 py-lg-0">
            <li className="nav-item">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-grid-3x3-gap-fill"></i>
                Templates
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/question-sets"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-collection-fill"></i>
                Question Sets
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/new-question-set"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <i className="bi bi-file-earmark-plus-fill"></i>
                New Question Set
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};
