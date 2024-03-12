import React, { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import { Button, Tooltip, IconButton, Typography, Avatar, Menu, MenuItem } from "@mui/material";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import AdminIcon from '@mui/icons-material/PeopleOutlineOutlined';
import ProjectIcon from '@mui/icons-material/AccountTreeOutlined';
// import MetricIcon from '@mui/icons-material/AutoGraphOutlined';
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

import { AppContext } from "../../App";

function Header() {
    const { logout, showSettings, context, setNotifyStatus } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [anchorElUser, setAnchorElUser] = useState(null);
    
    const pages = !context ?
        [] :
        context.session.role === "admin" ?
        [
            {
                title:"Admin",
                icon: <AdminIcon />,
                url: "/admin",
            },
            {
                title: "Project",
                icon: <ProjectIcon />,
                url: "/project",
            },
            // {
            //     title: "Metric",
            //     icon: <MetricIcon />,
            //     url: "/metric",
            // }
        ] :
        [
            {
                title: "Token",
                icon: <ProjectIcon />,
                url: "/token",
            },
            {
                title: "Project",
                icon: <ProjectIcon />,
                url: "/project",
            },
            // {
            //     title: "Metric",
            //     icon: <MetricIcon />,
            //     url: "/metric",
            // }
        ];
    const settings = [ "Settings", "Logout" ];

    useEffect(() => {
        function handleResize() {
            setWindowWidth(window.innerWidth);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [windowWidth]);

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleSelectNavMenu = (item) => {
        if (location.pathname != item.url) {
            setNotifyStatus({ success: true, tag: "NONE" });
            navigate(item.url);
        }
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleSelectUserMenu = (item) => {
        if (item === "Logout")
            logout();
        else if (item === "Settings")
            showSettings();
        setAnchorElUser(null);
    }
    
    return (
        <AppBar position="fixed">
            <Toolbar disableGutters>
                <DashboardIcon sx={{ display: { xs: "none", md: "flex" }, mr: 4, ml: 2 }} />
                <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
                    {
                        pages.map((item, index) => (
                            <Button
                                key={index}
                                sx={{ mx: 0.5, my: 2, color: "white", bgcolor: `${location.pathname === item.url ? "rgb(14, 118, 253)" : "transparent"}`, display: "block" }}
                                onClick={() => handleSelectNavMenu(item)}>
                                {item.title}
                            </Button>
                        ))
                    }
                </Box>
                <Box sx={{ display: { xs: "none", md: "flex" }, mr: 2 }}>
                    <WalletMultiButton />
                    {
                        context &&
                        <Tooltip title={context.session.name}>
                            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 2 }}>
                                <Avatar sx={{ bgcolor: "rgb(14, 118, 253)", color: "white" }}>
                                    {context.session.name[0].toUpperCase()}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                    }
                    {
                        context &&
                        <Menu
                            sx={{ mt: "45px" }}
                            id="menu-appbar"
                            anchorEl={anchorElUser}
                            anchorOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}>
                            {
                                settings.map((item, index) => (
                                    <MenuItem key={index} onClick={() => handleSelectUserMenu(item)}>
                                        <Typography textAlign="center">{item}</Typography>
                                    </MenuItem>
                                ))
                            }
                        </Menu>
                    }
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Header;
