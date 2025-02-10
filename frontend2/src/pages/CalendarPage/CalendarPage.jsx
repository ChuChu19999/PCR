import Layout from "../../shared/ui/Layout/Layout";
import Calendar from "../../widgets/Calendar";
import { events } from "../../widgets/Calendar/constants/mock.data";
import { CalendarPageWrapper } from "./CalendarPageWrapper";

const CalendarPage = () => (
  <CalendarPageWrapper>
    <Layout title="Календарь">
      <Calendar schedule={events} />
    </Layout>
  </CalendarPageWrapper>
);

export default CalendarPage;
