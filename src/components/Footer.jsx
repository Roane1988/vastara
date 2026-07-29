import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'

const linkClass = 'text-slate-400 hover:text-white transition-colors duration-200 text-sm'

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
    label: 'TikTok',
    href: 'https://www.tiktok.com/@myhunione?is_from_webapp=1&sender_device=pc',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
]

const footerLinks = [
  {
    title: 'Layanan',
    links: [
      { label: 'Beranda', to: '/' },
      { label: 'Beli Properti', to: '/explore' },
      { label: 'Sewa Properti', to: '/coming-soon' },
      { label: 'Forum Komunitas', to: '/forum' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', to: '/coming-soon' },
      { label: 'Hubungi Kami', to: '/coming-soon' },
    ],
  },
  {
    title: 'Dukungan',
    links: [
      { label: 'Kebijakan Privasi', to: '/coming-soon' },
      { label: 'Syarat & Ketentuan', to: '/coming-soon' },
      { label: 'Pusat Bantuan', to: '/coming-soon' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-brand-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:pt-16 lg:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="md:col-span-2">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold text-white tracking-tight">HuniOne</span>
            </Link>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
              Platform properti terdepan dan terpercaya di Indonesia.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((item) => {
                  if (item.href) {
                    return (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${linkClass} inline-flex items-center gap-1`}
                        >
                          {item.label}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={item.label}>
                      <Link to={item.to} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">
            &copy; 2026 HuniOne. All rights reserved.
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
      </div>
    </footer>
  )
}
