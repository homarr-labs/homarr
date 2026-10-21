FROM golang:1.24.5-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 GOTOOLCHAIN=local go build -trimpath -ldflags='-s -w' -o /relay .

FROM scratch
COPY --from=build /relay /relay
USER 65532:65532
EXPOSE 8787
ENTRYPOINT ["/relay"]
