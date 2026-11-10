import { jsx, jsxs } from "react/jsx-runtime";
import { Component } from "react";
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("IMS UI error:", error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return jsxs("div", { className: "empty card", style: { margin: "10vh auto", maxWidth: 480 }, children: [
      jsx("b", { children: "Something went wrong on this screen" }),
      jsx("span", { children: "Your saved data is safe. Reload to continue \u2014 if it keeps happening, tell the administrator." }),
      jsx("button", { className: "btn btn-primary", onClick: () => location.reload(), children: "Reload" })
    ] });
  }
}
export { ErrorBoundary as default };
