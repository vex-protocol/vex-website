import ax from "axios";
import { Fragment, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Hero } from "../components";
import {
    GITHUB_ENDPOINTS,
    GITHUB_RAW_URLS,
    GITHUB_REPOS,
    GITHUB_WEB_URLS,
} from "../components/constants";

export function PrivacyPolicy(): JSX.Element {
    const [privacyPolicyMd, setPrivacyPolicyMd] = useState("");

    const [commitHistory, setCommitHistory] = useState([] as any[]);

    useMemo(async () => {
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
        console.log(commitHistoryRes.data);
    }, []);

    return (
        <div className="view">
            <Hero
                content={
                    <div className="content is-large  is-family-monospace">
                        <h1 className="title">privacy policy </h1>
                        <h2 className="subtitle is-size-5">
                            we care about your privacy
                        </h2>
                    </div>
                }
            />
            <section className="has-background-light section">
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
                            <ReactMarkdown renderers={{}}>
                                {privacyPolicyMd}
                            </ReactMarkdown>
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

function Commit(props: { commit: any; showLastUpdated: boolean }): JSX.Element {
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
