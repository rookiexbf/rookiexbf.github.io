module.exports = {
  title: 'rookieX的博客',
  description: 'vitePress blog',
  head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  // 主题配置
  themeConfig: {
      siteTitle: 'rookieX',
      logo: '/logo.jpg',
      smoothScroll: true,
      lineNumbers: true,
      // nav:[
      //     {text: '我的个人网站', link: '' },
      //     {text: '掘金', link: ''},
      //     {text: 'Github', link: ''}
      // ],
      sidebar:{
          '/':getSidebar()
      }
  }
}

function getSidebar() {
  return [
    {
      text:'Vue',
      collapsed: false,
      items: [
        { text: 'nextTick', link: '/vue/nextTick' },
        { text: 'computed', link: '/vue/computed' },
      ],
    },
    {
      text:'Javascript',
      items:[
        { text: 'Promise', link: '/javaScript/promise' },
        { text: 'Async', link: '/javaScript/async' },
      ]
    },
    // {
    //   text:'其他',
    //   items: [
    //     { text: 'nextTick', link: '/vue/nextTick' },
    //   ],
    // },
    // {
    //   text:'React',
    //   items:[
    //     { text: '基础', link: '/CSS/' },
    //     { text: '进阶', link: '/CSS/advanced' },
    //   ]
    // },
    // {
    //   text:'算法',
    //   items:[
    //     { text: '基础', link: '/CSS/' },
    //   ]
    // },
    // {
    //   text:'Browser',
    //   items:[
    //     { text: '基础', link: '/Vue/' },
    //   ]
    // },
    // {
    //   text:'Network',
    //   items:[
    //     { text: '基础', link: '/Network/' },
    //   ]
    // },
  ]
}
