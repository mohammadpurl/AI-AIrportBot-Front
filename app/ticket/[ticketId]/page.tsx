
import TravelForm from "@/app/components/TravelForm";
import { NotificationProvider } from "@/app/contexts/NotificationContext";




// Define the type for params
interface Params {
  ticketId: string;
}

// Define the props type for the page
interface PageProps {
  params: Promise<Params>; // Use Promise<Params> for App Router async params
}




// Define the page component without NextPage
export default async function TicketPage({ params }: PageProps) {
  const { ticketId } = await params;
  return (
    <NotificationProvider>
      <TravelForm ticketId={ticketId} />
    </NotificationProvider>
  );
}
