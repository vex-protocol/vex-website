import ax from "axios";
import { Fragment, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import haloRed from "../assets/halo-red.jpeg";
import { WitchyOrbs } from "../components/WitchyOrbs";
import { useProceduralImages } from "../hooks/useProceduralImages";
import {
    GITHUB_ENDPOINTS,
    GITHUB_RAW_URLS,
    GITHUB_REPOS,
    GITHUB_WEB_URLS,
} from "../components/constants";
import { useSetRouteSections } from "../context/RouteSectionsContext";

/** Max paragraphs per mobile page – keeps each card readable without scroll */
const PARAGRAPHS_PER_PAGE = 2;

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

/** Split markdown by ## headers into sections; first chunk is intro (before any ##). Each section gets its own card. */
function splitPolicyBySections(
    md: string
): { id: string; title: string; content: string }[] {
    if (!md.trim()) return [];
    const sections: { id: string; title: string; content: string }[] = [];
    const idFromTitle = (t: string) =>
        t
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

    const parts = md.split(/\n## /);
    const intro = parts[0].trim();
    if (intro) {
        const firstLine = intro.split("\n")[0] || "";
        const titleMatch = firstLine.match(/^#\s+(.+)/);
        const mainTitle = titleMatch ? titleMatch[1].trim() : "Privacy Policy";
        const introContent = intro.replace(/^#\s+[^\n]+\n?/, "").trim();
        sections.push({
            id: "privacy-intro",
            title: mainTitle,
            content: introContent,
        });
    }

    for (let i = 1; i < parts.length; i++) {
        const block = parts[i];
        const lineEnd = block.indexOf("\n");
        const title =
            lineEnd >= 0 ? block.slice(0, lineEnd).trim() : block.trim();
        const content = lineEnd >= 0 ? block.slice(lineEnd + 1).trim() : "";
        const slug = idFromTitle(title);
        sections.push({
            id: `privacy-${slug}`,
            title,
            content,
        });
    }

    return sections;
}

/** Split a section into multiple pages for mobile (one page per N paragraphs) */
function splitSectionIntoPages(sec: {
    id: string;
    title: string;
    content: string;
}): { id: string; title: string; content: string }[] {
    const paras = sec.content.split(/\n\n+/).filter((p) => p.trim());
    if (paras.length <= PARAGRAPHS_PER_PAGE) {
        return [sec];
    }
    const pages: { id: string; title: string; content: string }[] = [];
    for (let i = 0; i < paras.length; i += PARAGRAPHS_PER_PAGE) {
        const chunk = paras.slice(i, i + PARAGRAPHS_PER_PAGE).join("\n\n");
        const pageIndex = Math.floor(i / PARAGRAPHS_PER_PAGE);
        pages.push({
            id: `${sec.id}-${pageIndex}`,
            title: pageIndex === 0 ? sec.title : `${sec.title} (cont.)`,
            content: chunk,
        });
    }
    return pages;
}

export function PrivacyPanel(): JSX.Element {
    const [privacyPolicyMd, setPrivacyPolicyMd] = useState("");
    const [commitHistory, setCommitHistory] = useState([] as any[]);
    const setSectionIds = useSetRouteSections();
    const { card } = useProceduralImages();

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

    const policySections = useMemo(
        () => splitPolicyBySections(privacyPolicyMd),
        [privacyPolicyMd]
    );

    const allPages = useMemo(() => {
        const pages: { id: string; title: string; content: string }[] = [];
        for (const sec of policySections) {
            pages.push(...splitSectionIntoPages(sec));
        }
        return pages;
    }, [policySections]);

    const sectionIds = useMemo(() => {
        const ids = ["privacy-header", ...allPages.map((p) => p.id)];
        if (commitHistory.length > 0) ids.push("privacy-update-history");
        return ids;
    }, [allPages, commitHistory.length]);

    useEffect(() => {
        setSectionIds("/privacy-policy", sectionIds);
    }, [setSectionIds, sectionIds]);

    const scrollToPolicy = () => {
        const firstId = allPages[0]?.id;
        if (firstId) {
            const el = document.getElementById(firstId);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    const lastUpdated = commitHistory[0]?.commit?.author?.date
        ? new Date(
              commitHistory[0].commit.author.date
          ).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null;

    return (
        <div className="mobile-cards privacy-panel-cards">
            <section
                className="section hero is-fullheight hero--with-halo mobile-card"
                id="privacy-header"
            >
                <div
                    className="hero-halo-bg"
                    style={{ backgroundImage: `url(${haloRed})` }}
                    aria-hidden
                />
                <div className="columns container has-text-left is-vcentered about-columns">
                    <div className="column section-bg" aria-hidden>
                        <WitchyOrbs
                            roomPath="/privacy-policy"
                            slotId="privacy-header"
                            section="about"
                        />
                    </div>
                    <div className="column is-12 section-content">
                        <div
                            className="content-frame content-frame--crt content-frame--procedural content"
                            style={
                                {
                                    ["--card-accent-color" as string]: card.color,
                                    ["--card-accent-bg" as string]: card.colorBg,
                                    ["--card-accent-glow" as string]:
                                        card.color + "60",
                                    ["--card-accent-glow-strong" as string]:
                                        card.color + "99",
                                } as React.CSSProperties
                            }
                        >
                            <span className="card-header">
                                <span className="card-header__img-wrap">
                                    <img
                                        src={card.image}
                                        alt=""
                                        className="card-header__img"
                                    />
                                </span>
                                <span className="card-header__title card-title--aviation">
                                    PRIVACY POLICY
                                </span>
                            </span>
                            <p className="subtitle">
                                We care about your privacy. Our policy explains
                                what data we collect and how we use it.
                            </p>
                            {lastUpdated && (
                                <p className="help no-pad">
                                    Last updated {lastUpdated}
                                </p>
                            )}
                            <button
                                onClick={scrollToPolicy}
                                className="button is-medium is-primary"
                            >
                                Read the privacy policy
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {allPages.map((page, idx) => (
                <section
                    key={page.id}
                    className="section mobile-card"
                    id={page.id}
                >
                    <div className="columns container has-text-left about-columns">
                        <div className="column section-bg" aria-hidden>
                            <WitchyOrbs
                                roomPath="/privacy-policy"
                                slotId={page.id}
                                section={idx % 2 === 0 ? "about" : "features"}
                            />
                        </div>
                        <div className="column section-content">
                            <div className="content-frame content-frame--crt content has-text-justified">
                                <h2 className="title is-4">{page.title}</h2>
                                <div className="privacy-section-scroll">
                                    {page.content
                                        .split(/\n\n+/)
                                        .filter((p) => p.trim())
                                        .map((para, i) => (
                                            <div
                                                key={i}
                                                className="privacy-paragraph"
                                            >
                                                <ReactMarkdown>
                                                    {para}
                                                </ReactMarkdown>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ))}

            {commitHistory.length > 0 && (
                <section
                    className="section mobile-card"
                    id="privacy-update-history"
                >
                    <div className="columns container has-text-left about-columns">
                        <div className="column section-bg" aria-hidden>
                            <WitchyOrbs
                                roomPath="/privacy-policy"
                                slotId="privacy-update-history"
                                section="about"
                            />
                        </div>
                        <div className="column section-content">
                            <div className="content-frame content-frame--crt content has-text-justified">
                                <h2 className="title is-4">Update History</h2>
                                <div className="privacy-section-scroll">
                                    {commitHistory[0] && (
                                        <Fragment>
                                            <Commit
                                                commit={commitHistory[0]}
                                                showLastUpdated={true}
                                                key={commitHistory[0].sha}
                                            />
                                            <br />
                                        </Fragment>
                                    )}
                                    {commitHistory.map((commit) => (
                                        <Commit
                                            commit={commit}
                                            showLastUpdated={false}
                                            key={commit.sha}
                                        />
                                    ))}
                                    <a
                                        className="help"
                                        href={
                                            GITHUB_WEB_URLS.PRIVACY_POLICY_COMMITS
                                        }
                                    >
                                        complete change history
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
