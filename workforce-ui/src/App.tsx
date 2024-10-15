
import 'reactflow/dist/style.css';

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Shell from './components/layout/dashboard/Shell';
import { ConfigurationState, configurationStore } from './state/store.configuration';
import { LoginPageComponent } from 'workforce-ui-core';

const configSelector = (state: ConfigurationState) => ({
    auth: state.auth,
    setAuth: state.setAuth,
    config: state.config,
});
function App() {

    const { config } = configurationStore(configSelector);

    const searchParams = new URLSearchParams(window.location.search);
    const state = searchParams.get("state");

    // if it's /workforce-ui/login, then we're in the login page
    if (window.location.pathname === "/workforce-ui/login") {
        return (
            <LoginPageComponent
                baseUrl={config.authIssuerUri}
                // get state from the URL
                state={state ?? ""}
            />
        )
    }

    return (
        <BrowserRouter basename='/workforce-ui'>
            <Shell />
        </BrowserRouter>
    );
}

export default App;