import { application } from "./host";

export default { fetch: (request: Request) => application.fetch(request) };
