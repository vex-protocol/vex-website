/* eslint-disable jsx-a11y/anchor-is-valid */
import { Switch, Route, Redirect, BrowserRouter } from "react-router-dom";
import { Invites, Team } from "./views";
import { AppNavigator } from "./components/AppNavigator";
import { DOWNLOAD_ENABLED } from "./components/constants";

export interface IServer {
    serverID: string;
    name: string;
    icon?: string;
}

export interface IInvite {
    inviteID: string;
    serverID: string;
    owner: string;
    expiration: string;
}

export interface IUser {
    userID: string;
    username: string;
    lastSeen: Date;
    passwordHash: string;
    passwordSalt: string;
}

export function Router(): JSX.Element {
    return (
        <BrowserRouter>
            <Switch>
                <Route
                    exact
                    path={"/download"}
                    render={() =>
                        DOWNLOAD_ENABLED ? (
                            <AppNavigator />
                        ) : (
                            <Redirect to="/" />
                        )
                    }
                />
                <Route
                    exact
                    path={["/", "/privacy-policy", "/contact"]}
                    render={() => <AppNavigator />}
                />
                <Route exact path={"/team"} render={() => <Team />} />
                <Route
                    path={"/invite/:id"}
                    render={({ match }) => <Invites match={match} />}
                />
            </Switch>
        </BrowserRouter>
    );
}
