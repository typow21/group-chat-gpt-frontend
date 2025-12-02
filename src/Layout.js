import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './navbar';
import Sidebar from './Sidebar';
import './layout.css';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="app-layout">
            <Navbar onToggleSidebar={toggleSidebar} />
            <div className="main-container">
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                <div className="content-area" onClick={() => isSidebarOpen && closeSidebar()}>
                    <Outlet />
                </div>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
        </div>
    );
};

export default Layout;
