import i18next from "i18next";


const sidebarMenu = () => [
  {
    name: 'Account',
    menuItems: [
      {
        name: 'common.label.dashboard',
        path: `/account`,
      },
      {
        name: 'App Conducente',
        path: `/driver/map`,
      },
      {
        name: 'common.label.billing',
        path: `/account/billing`,
      },
      {
        name: 'common.label.settings',
        path: `/account/settings`,
      },
    ],
  },
];

export default sidebarMenu;
