import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, CircleEllipsis , Plus, ReceiptText, UsersRound, Wallet } from 'lucide-react';

const transactions = [
  { title: 'Figma annual subscription', team: 'Product & Design', date: 'Today, 10:42 AM', category: 'Software', amount: 240, initials: 'ML', color: 'lavender' },
  { title: 'Client lunch — Morrow Co.', team: 'Sales', date: 'Today, 9:18 AM', category: 'Meals', amount: 86.5, initials: 'AK', color: 'peach' },
  { title: 'AWS cloud infrastructure', team: 'Engineering', date: 'Yesterday', category: 'Infrastructure', amount: 1240, initials: 'JR', color: 'mint' },
  { title: 'Team offsite supplies', team: 'People & Culture', date: 'Oct 2, 2026', category: 'Office', amount: 318.2, initials: 'SC', color: 'blue' },
];
const budgets = [
  { name: 'Engineering', used: 18400, total: 26000, color: 'violet', people: '8 members' },
  { name: 'Product & Design', used: 12850, total: 18000, color: 'blue', people: '5 members' },
  { name: 'Sales', used: 9200, total: 15000, color: 'orange', people: '6 members' },
];
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export default function DashboardPage() {
  const [period, setPeriod] = useState('This month');
  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> MONDAY, OCTOBER 5, 2026</div><h1>Good morning, Jordan <span className="wave">✦</span></h1><p>Here’s what’s happening with your organization today.</p></div><div className="heading-actions"><button className="button button-secondary"><CalendarDays size={16}/>{period}<span className="chevron">⌄</span></button><Link className="button button-primary" to="/expenses"><Plus size={17}/>New transaction</Link></div></div>
    <div className="metric-grid">
      <Metric title="Total spend" value="$42,680" change="12.8%" sub="vs. last month" icon={<Wallet size={18}/>} positive={false}/>
      <Metric title="Remaining budget" value="$27,320" change="39.0%" sub="of $70,000 total" icon={<Plus size={18}/>} positive/>
      <Metric title="Active teams" value="8" change="2 new" sub="this quarter" icon={<UsersRound size={18}/>} positive/>
      <Metric title="Organization members" value="24" change="3 pending" sub="invitations" icon={<Building2 size={18}/>} positive/>
    </div>

    <div className="dashboard-grid">
      <section className="panel spend-panel"><div className="panel-heading"><div><h2>Spending overview</h2><p>Track your organization's spending over time</p></div><button className="button button-quiet">Monthly <span className="chevron">⌄</span></button></div><div className="chart-summary"><strong>$42,680</strong><span className="trend trend-down"><ArrowDownRight size={14}/> 8.2%</span><span className="summary-note">vs. previous month</span></div><div className="chart-area"><div className="chart-y-labels"><span>$20k</span><span>$15k</span><span>$10k</span><span>$5k</span><span>$0</span></div><div className="chart-main"><div className="chart-grid-lines"><i/><i/><i/><i/><i/></div><div className="bars">{[44, 55, 38, 68, 55, 73, 59, 83, 68, 77, 63, 90].map((height, i) => <div className="bar-pair" key={i}><span className="bar bar-muted" style={{ height: `${height * .72}%` }}/><span className={`bar ${i === 11 ? 'bar-accent' : 'bar-main'}`} style={{ height: `${height}%` }}/></div>)}</div><div className="chart-x-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div></div></div><div className="chart-legend"><span><i className="legend-dot legend-accent"/>This year</span><span><i className="legend-dot legend-muted"/>Last year</span></div></section>
      <section className="panel budget-panel"><div className="panel-heading"><div><h2>Team budgets</h2><p>Budget usage by team</p></div><Link to="/teams" className="text-link">View all <ArrowRight size={14}/></Link></div><div className="budget-total"><div className="budget-ring"><span><strong>61%</strong><small>used</small></span></div><div><span className="subtle-label">TOTAL BUDGET</span><strong className="budget-total-value">$70,000</strong><span className="budget-remaining">$27,320 remaining</span></div></div><div className="budget-list">{budgets.map((item) => <div className="budget-item" key={item.name}><div className="budget-line"><span className="team-color-dot" data-tone={item.color}/><strong>{item.name}</strong><span className="budget-amount">{money(item.used)} <i>/ {money(item.total)}</i></span></div><div className="progress-track"><span className={`progress-fill ${item.color}`} style={{ width: `${item.used / item.total * 100}%` }}/></div></div>)}</div><Link to="/teams" className="panel-footer-link">Manage team budgets <ArrowRight size={15}/></Link></section>
    </div>

    <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Your latest organization expenses</p></div><Link to="/expenses" className="text-link">See all transactions <ArrowRight size={14}/></Link></div><div className="table-scroll"><table className="data-table"><thead><tr><th>TRANSACTION</th><th>TEAM</th><th>DATE</th><th>CATEGORY</th><th className="align-right">AMOUNT</th><th/></tr></thead><tbody>{transactions.map((item) => <tr key={item.title}><td><div className="transaction-title"><span className={`merchant-icon ${item.color}`}><ReceiptText size={16}/></span><strong>{item.title}</strong></div></td><td>{item.team}</td><td>{item.date}</td><td><span className="category-pill">{item.category}</span></td><td className="align-right amount-cell">−{money(item.amount)}</td><td><button className="icon-button row-more" aria-label="More options"><CircleEllipsis size={18}/></button></td></tr>)}</tbody></table></div><Link to="/expenses" className="mobile-table-link">View all transactions <ArrowRight size={15}/></Link></section>
    <div className="bottom-note"><span className="status-dot"/> Your workspace is up to date <span>•</span> Last synced just now</div>
  </div>;
}

function Metric({ title, value, change, sub, icon, positive }: { title: string; value: string; change: string; sub: string; icon: React.ReactNode; positive: boolean }) {
  return <section className="panel metric-card"><div className="metric-top"><span>{title}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-foot"><span className={`metric-change ${positive ? 'change-good' : 'change-warn'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span><span>{sub}</span></div></section>;
}
