import { render } from "preact";
import { App } from "./App";
import "./tailwind.css";
import "./styles.css";

render(<App />, document.getElementById("root") as HTMLElement);
