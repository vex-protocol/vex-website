import ax from "axios";
import { Fragment, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
    GITHUB_ENDPOINTS,
    GITHUB_RAW_URLS,
    GITHUB_REPOS,
    GITHUB_WEB_URLS,
} from "../components/constants";

function Commit(props: {
    commit: any;
    showLastUpdated: boolean;
}): JSX.Element {
    return (
        <p className="help no-pad">
            {props.showLastUpdated && "Last updated on "}
            {new Date(
                props.commit.commit.author.date
            ).toLocaleDateString()}: {props.commit.commit.message}{" "}
            <a href={props.commit.html_url}>view diff</a>
        </p>
    );
}

export function PrivacyPanel(): JSX.Element {
    const [privacyPolicyMd, setPrivacyPolicyMd] = useState("");
    const [commitHistory, setCommitHistory] = useState([] as any[]);

    useEffect(() => {
        const load = async () => {
            const policyRes = await ax.get(GITHUB_RAW_URLS.PRIVACY_POLICY);
            setPrivacyPolicyMd(policyRes.data);

            const commitRes = await ax.get(
                GITHUB_ENDPOINTS.COMMITS(GITHUB_REPOS.PRIVACY_POLICY, "main")
            );
            const commitHistoryRes = await ax.get(
                GITHUB_ENDPOINTS.COMMIT_HISTORY(
                    GITHUB_REPOS.PRIVACY_POLICY,
                    commitRes.data.sha,
                    10
                )
            );
            setCommitHistory(commitHistoryRes.data);
        };
        load();
    }, []);

    return (
        <div className="mobile-cards privacy-panel-cards">
            <section
                className="section hero is-large mobile-card"
                id="privacy-header"
            >
                <div className="hero-body">
                    <div className="container">
                        <div className="content is-large is-family-monospace">
                            <h1 className="title">privacy policy</h1>
                            <h2 className="subtitle is-size-5">
                                we care about your privacy
                            </h2>
                        </div>
                    </div>
                </div>
            </section>
            <section
                className="section has-background-light mobile-card"
                id="privacy-content"
            >
                <div className="container">
                    <div className="columns">
                        <div className="column has-text-justified is-half">
                            {commitHistory && commitHistory[0] && (
                                <Fragment>
                                    <Commit
                                        commit={commitHistory[0]}
                                        showLastUpdated={true}
                                        key={commitHistory[0].sha}
                                    />
                                    <br />
                                </Fragment>
                            )}
                            <ReactMarkdown>{privacyPolicyMd}</ReactMarkdown>
                            <h2>Update History</h2>
                            {commitHistory.map((commit) => (
                                <Commit
                                    commit={commit}
                                    showLastUpdated={false}
                                    key={commit.sha}
                                />
                            ))}
                            <a
                                className="help"
                                href={GITHUB_WEB_URLS.PRIVACY_POLICY_COMMITS}
                            >
                                complete change history
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
