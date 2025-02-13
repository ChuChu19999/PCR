import Page404Wrapper from './Page404Wrapper';
import animation404 from '../../../shared/assets/animations/404_1.json';
import { ErrorCard } from '../../../features/Cards';

const Page404 = () => {
  return (
    <Page404Wrapper>
      <ErrorCard
        title="Ошибка 404"
        text="Кажется вы зашли не на ту страницу.
        Вернитесь к главной странице и повторите попытку."
        animation={animation404}
      />
    </Page404Wrapper>
  );
};

export default Page404;
