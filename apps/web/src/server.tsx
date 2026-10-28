import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import {
	RouterServer,
	renderRouterToString,
} from "@tanstack/react-router/ssr/server";
import {
	createServerEntry,
	createStartHandler,
} from "@tanstack/react-start/server";

const fetch = createStartHandler(async ({ router, responseHeaders }) => {
	const styleCache = createCache();
	const response = await renderRouterToString({
		router,
		responseHeaders,
		children: (
			<StyleProvider cache={styleCache}>
				<RouterServer router={router} />
			</StyleProvider>
		),
	});

	const html = await response.text();
	const styles = extractStyle(styleCache);

	return new Response(html.replace("</head>", `${styles}</head>`), response);
});

export default createServerEntry({ fetch });
