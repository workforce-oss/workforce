import { DocumentScannerOutlined, GraphicEq, HandymanOutlined, LockOutlined, PaletteRounded, PersonOutlined } from "@mui/icons-material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import MuiDrawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ThemeProvider, createTheme, styled } from "@mui/material/styles";
import * as React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { CredentialListComponent } from "../../credentials/CredentialList";
import { TaskExecutionListComponent } from "../../observability/TaskExecutionList";
import { SKillListComponent } from "../../skills/SkillList";
import { WorkerListComponent } from "../../workers/WorkerList";
import { Designer } from "../designer/Designer";
import { DashboardComponent } from "./DashboardComponent";
import { DocumentRepositoryListComponent } from "../../documentation/DocumentRepositoryList";
import { ConfigurationState, configurationStore } from "../../../state/store.configuration";
import { Auth } from "workforce-ui-core";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, OrgData, contextStore } from "../../../state/store.context";
import { useEffect } from "react";
import { config } from "process";

const drawerWidth: number = 240;

interface AppBarProps extends MuiAppBarProps {
	open?: boolean;
}

const AppBar = styled(MuiAppBar, {
	shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
	zIndex: theme.zIndex.drawer + 1,
	transition: theme.transitions.create(["width", "margin"], {
		easing: theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen,
	}),
	...(open && {
		marginLeft: drawerWidth,
		width: `calc(100% - ${drawerWidth}px)`,
		transition: theme.transitions.create(["width", "margin"], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
	}),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(({ theme, open }) => ({
	"& .MuiDrawer-paper": {
		position: "relative",
		whiteSpace: "nowrap",
		width: drawerWidth,
		transition: theme.transitions.create("width", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.enteringScreen,
		}),
		boxSizing: "border-box",
		...(!open && {
			overflowX: "hidden",
			transition: theme.transitions.create("width", {
				easing: theme.transitions.easing.sharp,
				duration: theme.transitions.duration.leavingScreen,
			}),
			width: theme.spacing(7),
			[theme.breakpoints.up("sm")]: {
				width: theme.spacing(9),
			},
		}),
	},
}));

// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();

const configSelector = (state: ConfigurationState) => ({
    auth: state.auth,
    config: state.config,
	setAuth: state.setAuth,
});

const contextSelector = (state: ContextState) => ({
	currentOrg: state.currentOrg,
	selectOrg: state.selectOrg,
	addOrgs: state.addOrgs,
});

export default function Shell() {
	const [open, setOpen] = React.useState(true);
	const toggleDrawer = () => {
		setOpen(!open);
	};
	const [headerText, setHeaderText] = React.useState("Dashboard");
	
	const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const { setAuth, auth, config } = configurationStore(configSelector);
	const { addOrgs, selectOrg, currentOrg } = contextStore(contextSelector);

    const apiBaseUrl = config.apiBaseUrl;
    const apiBasePath = config.apiBasePath;
    
    const authIssuerUri = config.authIssuerUri;
	const authActive = React.useRef(false);

    const clientId = config.clientId;


    useEffect(() => {
		if (authActive.current) {
			return;
		}
        Auth.init(authIssuerUri, clientId);
        Auth.session().then((session) => {
            const userId = Auth.getUserId();
            const unauthorizedCallBack = () => {
                Auth.refreshToken().then(() => {
                    Auth.session().then((newSession) => {
                        WorkforceAPIClient.setAccessToken(newSession.auth.accessToken);
                    }).catch(() => {
                        console.error("Error refreshing token");
                    }).catch(() => {
                        console.error("Error refreshing token");
                    });
                }).catch(() => {
                    console.error("Error refreshing token");
                });
            };

            WorkforceAPIClient.init({
                accessToken: session.auth.accessToken,
                baseUrl: apiBaseUrl,
                basePath: apiBasePath,
                unauthorizedCallBack: unauthorizedCallBack
            });

            setAuth({
                session,
                userId
            });
            setLoading(false);
			authActive.current = false;
        }).catch((err) => {
            setError(err.message);
            setLoading(false);
			authActive.current = false;
        });

		authActive.current = true;

        return () => {
            // Auth.refreshToken().catch(() => {
            //     console.error("Error refreshing token");
            // });
        }

    }, []);

	useEffect(() => {
		if (!auth?.session?.auth?.accessToken) {
			return;
		}
		WorkforceAPIClient.UserAPI.get(auth.userId).then((user) => {
			const mappedOrgs: OrgData[] = user.relations?.map((relation) => {
				return {
					id: relation.orgId,
					description: "",
					name: "",
					roles: [relation.role],
				}
			});
			const mergedOrgs: OrgData[] = [];
			for (const org of mappedOrgs) {
				const existingOrg = mergedOrgs.find((o) => o.id === org.id);
				if (existingOrg) {
					existingOrg.roles.push(...org.roles);
				} else {
					mergedOrgs.push(org);
				}
			}
			if (mergedOrgs.length === 0) {
				console.error("No orgs found for user");
			}
			addOrgs(mergedOrgs);
			selectOrg(mergedOrgs[0].id);
			
		}).catch((e) => {
			console.error(e);
		});
	}, [auth]);

    if (loading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>{error}</div>;
    }
	if (!currentOrg) {
		return <div>No org selected</div>;
	}

	

	return (
		<ThemeProvider theme={defaultTheme}>
			<Box sx={{ display: "flex" }}>
				<CssBaseline />
				<AppBar position="absolute" open={open}>
					<Toolbar
						sx={{
							pr: "24px", // keep right padding when drawer closed
						}}
					>
						<IconButton
							edge="start"
							color="inherit"
							aria-label="open drawer"
							onClick={toggleDrawer}
							sx={{
								marginRight: "36px",
								...(open && { display: "none" }),
							}}
						>
							<MenuIcon />
						</IconButton>
						<Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
							{headerText}
						</Typography>
					</Toolbar>
				</AppBar>
				<Drawer variant="permanent" open={open}>
					<Toolbar
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							px: [2],
						}}
					>
						<Typography variant="h6" component="div">
							Workforce
						</Typography>
						<IconButton onClick={toggleDrawer}>
							<ChevronLeftIcon />
						</IconButton>
					</Toolbar>
					<Divider />
					<List component="nav">
						<ListItemButton
							key={"dashboard"}
							component={Link}
							to={"/"}
							onClick={() => setHeaderText("Dashboard")}
						>
							<ListItemIcon>
								<DashboardIcon />
							</ListItemIcon>
							<ListItemText primary="Dashboard" />
						</ListItemButton>
						<ListItemButton
							key={"credentials"}
							component={Link}
							to={"/integrations"}
							onClick={() => setHeaderText("Integrations")}
						>
							<ListItemIcon>
								<LockOutlined />
							</ListItemIcon>
							<ListItemText primary="Integrations" />
						</ListItemButton>
						<ListItemButton
							key={"skills"}
							component={Link}
							to={"/skills"}
							onClick={() => setHeaderText("Skills")}
						>
							<ListItemIcon>
								<HandymanOutlined />
							</ListItemIcon>
							<ListItemText primary="Skills" />
						</ListItemButton>
						<ListItemButton
							key={"workers"}
							component={Link}
							to={"/workers"}
							onClick={() => setHeaderText("Workers")}
						>
							<ListItemIcon>
								<PersonOutlined />
							</ListItemIcon>
							<ListItemText primary="Workers" />
						</ListItemButton>
						<ListItemButton
							key={"documents"}
							component={Link}
							to={"/documents"}
							onClick={() => setHeaderText("Documents")}
						>
							<ListItemIcon>
								<DocumentScannerOutlined />
							</ListItemIcon>
							<ListItemText primary="Documents" />
						</ListItemButton>
						<ListItemButton
							key={"designer"}
							component={Link}
							to={"/designer"}
							onClick={() => setHeaderText("Designer")}
						>
							<ListItemIcon>
								<PaletteRounded />
							</ListItemIcon>
							<ListItemText primary="Designer" />
						</ListItemButton>
						<ListItemButton
							key={"observability"}
							component={Link}
							to={"/observability"}
							onClick={() => setHeaderText("Observability")}
						>
							<ListItemIcon>
								<GraphicEq />
							</ListItemIcon>
							<ListItemText primary="Observability" />
						</ListItemButton>
					</List>
				</Drawer>
				<Box
					component="main"
					sx={{
						backgroundColor: (theme) =>
							theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.grey[900],
						flexGrow: 1,
						height: "100vh",
						overflow: "auto",
						p: 0,
						m: 0,
					}}
				>
					<Toolbar />
					<Container disableGutters maxWidth={false} sx={{ m: 0, p: 0, height: "calc(100% - 64px)" }}>
						<Routes>
							<Route path="/" element={<DashboardComponent />} />
							<Route path="/integrations" element={<CredentialListComponent />} />
							<Route path="/designer" element={<Designer />} />
							<Route path="/skills" element={<SKillListComponent />} />
							<Route path="/workers" element={<WorkerListComponent />} />
							<Route path="/documents" element={<DocumentRepositoryListComponent />} />
							<Route path="/observability" element={<TaskExecutionListComponent />} />
						</Routes>
					</Container>
				</Box>
			</Box>
		</ThemeProvider>
	);
}
