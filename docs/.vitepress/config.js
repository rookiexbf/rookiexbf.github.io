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
        { 
          text:'Vue2',
          items:[
            { text: 'nextTick源码分析', link: '/vue2/nextTick' },
            { text: 'computed源码分析', link: '/vue2/computed' },
          ]
        },{
          text:'Vue3',
          items:[
            { text: 'ref源码分析', link: '/vue3/ref' },
            { text: 'reactive源码分析', link: '/vue3/reactive' },
          ]
        }
      ],
    },
    {
      text:'Javascript',
      items:[
        { text: 'Promise实现', link: '/javaScript/promise' },
        { text: 'Generator实现', link: '/javaScript/generator' },
        { text: 'Async实现', link: '/javaScript/async' },
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
