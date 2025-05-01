export class ResponseError extends Error {
  public readonly statusCode: number;
  public readonly url: string;

  constructor(response: { status: number; url: string }) {
    super("Response did not indicate success");

    this.statusCode = response.status;
    this.url = response.url;
  }
}
