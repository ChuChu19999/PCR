import animation502 from '../../../shared/assets/animations/502_1.json';
import { ErrorCard } from '../../../features/Cards';
import Page502Wrapper from './Page502Wrapper';

const Page502 = () => {
  return (
    <Page502Wrapper>
      <ErrorCard
        title="Ошибка 502"
        text="Кажется вы зашли не на ту страницу.
        Вернитесь к главной странице и повторите попытку."
        animation={animation502}
      />
    </Page502Wrapper>
  );
};

export default Page502;
