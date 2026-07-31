import { Link } from 'react-router-dom'

const navGroups = [
  {
    title: 'Jelajahi',
    links: [
      { label: 'Beli Rumah', to: '/explore' },
      { label: 'Jual Rumah', to: '/sell' },
      { label: 'Properti Baru', to: '/explore' },
      { label: 'Cari Agen', to: '/coming-soon' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', to: '/coming-soon' },
      { label: 'Blog', to: '/coming-soon' },
      { label: 'Karier', to: '/coming-soon' },
      { label: 'Hubungi Kami', to: '/coming-soon' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'FAQ', to: '/coming-soon' },
      { label: 'Pusat Bantuan', to: '/coming-soon' },
      { label: 'Lapor Masalah', to: '/coming-soon' },
      { label: 'Hubungi Kami', to: '/coming-soon' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Kebijakan Privasi', to: '/coming-soon' },
      { label: 'Syarat Penggunaan', to: '/coming-soon' },
      { label: 'Cookie Policy', to: '/coming-soon' },
      { label: 'Disclaimer', to: '/coming-soon' },
    ],
  },
]

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/myhunione/?utm_source=ig_web_button_share_sheet',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.38 2.525c.636-.247 1.363-.416 2.427-.465C8.76 2.013 9.095 2 12.315 2zm0 1.802c-2.41 0-2.695.013-3.707.06-.908.044-1.393.195-1.723.322a2.877 2.877 0 00-1.067.694 2.877 2.877 0 00-.694 1.067c-.127.33-.278.815-.322 1.722-.047 1.013-.06 1.297-.06 3.708v.63c0 2.41.013 2.695.06 3.707.044.908.195 1.393.322 1.723.173.43.398.81.694 1.067a2.877 2.877 0 001.067.694c.33.127.815.278 1.722.322 1.013.047 1.297.06 3.708.06h.63c2.41 0 2.695-.013 3.707-.06.908-.044 1.393-.195 1.723-.322a2.877 2.877 0 001.067-.694 2.877 2.877 0 00.694-1.067c.127-.33.278-.815.322-1.722.047-1.013.06-1.297.06-3.708v-.63c0-2.41-.013-2.695-.06-3.707-.044-.908-.195-1.393-.322-1.723a2.877 2.877 0 00-.694-1.067 2.877 2.877 0 00-1.067-.694c-.33-.127-.815-.278-1.722-.322-1.013-.047-1.297-.06-3.707-.06h-.63zm0 1.216c1.573 0 1.954.013 2.642.047.987.045 1.51.203 1.86.341.466.186.801.41 1.154.763.353.353.577.688.763 1.154.138.35.296.873.341 1.86.034.688.047 1.07.047 2.642s-.013 1.954-.047 2.642c-.045.987-.203 1.51-.341 1.86-.186.466-.41.801-.763 1.154-.353.353-.688.577-1.154.763-.35.138-.873.296-1.86.341-.663.031-1.018.042-2.642.042s-1.979-.01-2.642-.042c-.987-.045-1.51-.203-1.86-.341a2.898 2.898 0 01-1.154-.763 2.898 2.898 0 01-.763-1.154c-.138-.35-.296-.873-.341-1.86-.031-.663-.042-1.018-.042-2.642s.01-1.979.042-2.642c.045-.987.203-1.51.341-1.86.186-.466.41-.801.763-1.154a2.898 2.898 0 011.154-.763c.35-.138.873-.296 1.86-.341.688-.034 1.07-.047 2.642-.047z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@myhunione?is_from_webapp=1&sender_device=pc',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer className="bg-brand-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block">
              <img src="/huniOne.svg" alt="HuniOne" className="h-20 md:h-24 w-auto object-contain" />
            </Link>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              Hunione adalah platform digital yang membantu masyarakat membeli dan menjual rumah dengan lebih mudah, aman, dan terpercaya.
            </p>
          </div>
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-slate-400 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Follow Us
              </p>
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-white transition-colors duration-200"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
            <p className="text-slate-500 text-xs sm:text-right">
              &copy; 2026 HuniOne. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
