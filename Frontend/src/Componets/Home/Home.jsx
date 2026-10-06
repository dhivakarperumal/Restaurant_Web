import HomeProducts from './HomeProducts';
import HomeCategories from '../../CommonComponents/HomeCategories';
import HomeCuisines from '../../CommonComponents/HomeCuisines';
import HomeBanner from '../../CommonComponents/HomeBanner';

const Home = () => {
  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <HomeBanner />
      <HomeCategories />
      <HomeCuisines />
      <HomeProducts />
    </main>
  );
};

export default Home;
