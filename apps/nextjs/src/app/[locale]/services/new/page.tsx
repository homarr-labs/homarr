import { Container, Stack, Title } from "@homarr/ui";

import { NewServiceForm } from "./_form";

interface ServiceNewPageProps {
  searchParams: {
    name?: string;
    url?: string;
    callbackUrl?: string;
  };
}

export default function ServiceNewPage(props: ServiceNewPageProps) {
  return (
    <Container>
      <Stack>
        <Title>New service</Title>
        <NewServiceForm
          searchParams={{
            ...props.searchParams,
            callbackUrl: decodeURIComponent(
              props.searchParams.callbackUrl ?? "",
            ),
          }}
        />
      </Stack>
    </Container>
  );
}
