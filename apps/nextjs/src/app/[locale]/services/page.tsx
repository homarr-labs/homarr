import Link from "next/link";

import type { RouterOutputs } from "@homarr/api";
import {
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { DeleteServiceActionButton } from "./_buttons";

export default async function ServicesPage() {
  const services = await api.service.all.query(undefined);
  return (
    <Container>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>Services</Title>
          <Button component={Link} href="/services/new">
            New service
          </Button>
        </Group>
        <ServiceList services={services} />
      </Stack>
    </Container>
  );
}

interface ServiceListProps {
  services: RouterOutputs["service"]["all"];
}

const ServiceList = ({ services }: ServiceListProps) => {
  if (services.length === 0) {
    return <div>No services</div>;
  }

  return (
    <Table>
      <TableThead>
        <TableTr>
          <TableTh>Name</TableTh>
          <TableTh>Url</TableTh>
          <TableTh />
        </TableTr>
      </TableThead>
      <TableTbody>
        {services.map((service) => (
          <TableTr key={service.id}>
            <TableTd>{service.name}</TableTd>
            <TableTd>
              <Anchor
                href={service.url}
                target="_blank"
                rel="noreferrer"
                size="sm"
              >
                {service.url}
              </Anchor>
            </TableTd>
            <TableTd>
              <Group justify="flex-end">
                <DeleteServiceActionButton
                  serviceId={service.id}
                  hasRelations={service.hasRelations}
                />
              </Group>
            </TableTd>
          </TableTr>
        ))}
      </TableTbody>
    </Table>
  );
};
