/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  Activity01Icon,
  Add01Icon,
  AddCircleIcon,
  AiBrain01Icon,
  AiImageIcon,
  AiMagicIcon,
  AiScanIcon,
  AlertCircleIcon,
  AnalyticsDownIcon,
  AnalyticsUpIcon,
  ArrowDown01Icon,
  ArrowDownRight01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  AttachmentIcon,
  BarChartIcon as HugeBarChartIcon,
  BellDotIcon,
  BookOpen01Icon,
  BookOpenCheckIcon,
  BotIcon,
  Building03Icon,
  Calendar03Icon,
  Camera01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckListIcon,
  CheckmarkCircle01Icon,
  CheckmarkSquare01Icon,
  ChartAreaIcon,
  CircleIcon as HugeCircleIcon,
  Clock01Icon,
  CloudIcon,
  CodeIcon,
  CodeSquareIcon as HugeCodeSquareIcon,
  CoinsDollarIcon,
  Copy01Icon,
  CreditCardIcon,
  CrownIcon,
  Database01Icon,
  DashboardSpeed01Icon,
  Delete02Icon,
  Dollar01Icon,
  Download01Icon,
  Edit01Icon,
  EyeIcon,
  File01Icon,
  FileCodeIcon,
  FilterIcon,
  FloppyDiskIcon,
  GiftIcon,
  GlobalIcon,
  GridIcon,
  HandGripIcon,
  HashtagIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  Home01Icon,
  InformationCircleIcon,
  Key01Icon,
  LandmarkIcon,
  LanguageCircleIcon,
  LaptopIcon,
  LayerIcon,
  Layers01Icon,
  Layout01Icon,
  IdeaIcon,
  Link01Icon,
  Loading03Icon,
  Login01Icon,
  Logout01Icon,
  Mail01Icon,
  Maximize01Icon,
  Megaphone01Icon,
  Menu01Icon,
  Message01Icon,
  Message02Icon,
  Mic01Icon,
  MinusSignIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  MouseLeftClick02Icon,
  MoveIcon,
  MusicNote01Icon,
  NotepadTextDashedIcon,
  Package01Icon,
  PaintBrush01Icon,
  ColorsIcon,
  PanelLeftOpenIcon,
  PencilEdit01Icon,
  PieChartIcon,
  PlayCircleIcon,
  PowerServiceIcon,
  Presentation01Icon,
  QrCodeIcon,
  Radio01Icon,
  ReceiptTextIcon,
  RefreshIcon,
  ReloadIcon,
  Route02Icon,
  ScissorIcon,
  Scroll01Icon,
  Search01Icon,
  SentIcon,
  ServerStack01Icon,
  Settings01Icon,
  Share01Icon,
  Shield01Icon,
  ShieldKeyIcon,
  ShuffleIcon,
  SlidersHorizontalIcon,
  Sorting01Icon,
  SquareIcon as HugeSquareIcon,
  Sun01Icon,
  Table01Icon,
  Tag01Icon,
  TerminalIcon,
  TestTube01Icon,
  Timer01Icon,
  Award01Icon,
  TypeCursorIcon,
  Unlink01Icon,
  UserCircleIcon,
  UserGroup02Icon,
  UserIcon,
  Video01Icon,
  Wallet01Icon,
  WebhookIcon,
  WifiOff01Icon,
  WorkflowCircle01Icon,
  Wrench01Icon,
  ZapIcon,
  ZoomInAreaIcon,
} from '@hugeicons/core-free-icons'
import {
  HugeiconsIcon,
  type IconSvgElement,
} from '@hugeicons/react'
import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type SVGProps,
} from 'react'

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: string | number
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
}

export type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<SVGSVGElement>
>

function createHugeicon(icon: IconSvgElement, displayName: string): LucideIcon {
  const Component = forwardRef<SVGSVGElement, LucideProps>(
    (
      {
        color,
        size,
        strokeWidth = 1.8,
        absoluteStrokeWidth,
        ...props
      },
      ref
    ) => (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth={absoluteStrokeWidth}
        color={color}
        {...props}
      />
    )
  )

  Component.displayName = displayName
  return Component
}

export const Activity = createHugeicon(Activity01Icon, 'Activity')
export const AlertCircle = createHugeicon(AlertCircleIcon, 'AlertCircle')
export const AlertTriangle = createHugeicon(AlertCircleIcon, 'AlertTriangle')
export const AreaChart = createHugeicon(ChartAreaIcon, 'AreaChart')
export const ArrowDown = createHugeicon(ArrowDown01Icon, 'ArrowDown')
export const ArrowDownIcon = ArrowDown
export const ArrowDownRight = createHugeicon(
  ArrowDownRight01Icon,
  'ArrowDownRight'
)
export const ArrowLeft = createHugeicon(ArrowLeft01Icon, 'ArrowLeft')
export const ArrowLeftIcon = ArrowLeft
export const ArrowRight = createHugeicon(ArrowRight01Icon, 'ArrowRight')
export const ArrowRightIcon = ArrowRight
export const ArrowRightLeft = createHugeicon(
  ArrowLeftRightIcon,
  'ArrowRightLeft'
)
export const ArrowUp = createHugeicon(ArrowUp01Icon, 'ArrowUp')
export const ArrowUpDown = createHugeicon(ArrowUpDownIcon, 'ArrowUpDown')
export const ArrowUpFromLine = createHugeicon(ArrowUp01Icon, 'ArrowUpFromLine')
export const ArrowUpRight = createHugeicon(ArrowUpRight01Icon, 'ArrowUpRight')
export const BarChart3 = createHugeicon(HugeBarChartIcon, 'BarChart3')
export const BarChartIcon = BarChart3
export const Bell = createHugeicon(BellDotIcon, 'Bell')
export const Blend = createHugeicon(ShuffleIcon, 'Blend')
export const BookIcon = createHugeicon(BookOpen01Icon, 'BookIcon')
export const BookOpen = BookIcon
export const BookOpenCheck = createHugeicon(
  BookOpenCheckIcon,
  'BookOpenCheck'
)
export const Bot = createHugeicon(BotIcon, 'Bot')
export const Brain = createHugeicon(AiBrain01Icon, 'Brain')
export const Box = createHugeicon(Package01Icon, 'Box')
export const Boxes = createHugeicon(Package01Icon, 'Boxes')
export const BoxIcon = Boxes
export const Braces = createHugeicon(CodeIcon, 'Braces')
export const BrainIcon = createHugeicon(AiBrain01Icon, 'BrainIcon')
export const Building2 = createHugeicon(Building03Icon, 'Building2')
export const Calendar = createHugeicon(Calendar03Icon, 'Calendar')
export const CalendarClock = createHugeicon(Clock01Icon, 'CalendarClock')
export const CalendarDays = Calendar
export const CameraIcon = createHugeicon(Camera01Icon, 'CameraIcon')
export const Check = createHugeicon(CheckmarkCircle01Icon, 'Check')
export const CheckCircle2 = Check
export const CheckCircleIcon = Check
export const CheckIcon = Check
export const CheckSquare = createHugeicon(CheckmarkSquare01Icon, 'CheckSquare')
export const ChevronDown = createHugeicon(ArrowDown01Icon, 'ChevronDown')
export const ChevronDownIcon = ChevronDown
export const ChevronLeft = createHugeicon(ArrowLeft01Icon, 'ChevronLeft')
export const ChevronLeftIcon = ChevronLeft
export const ChevronRight = createHugeicon(ArrowRight01Icon, 'ChevronRight')
export const ChevronRightIcon = ChevronRight
export const ChevronsLeft = createHugeicon(ArrowLeftDoubleIcon, 'ChevronsLeft')
export const ChevronsRight = createHugeicon(
  ArrowRightDoubleIcon,
  'ChevronsRight'
)
export const ChevronsUpDown = createHugeicon(
  ArrowUpDownIcon,
  'ChevronsUpDown'
)
export const ChevronsUpDownIcon = ChevronsUpDown
export const ChevronUp = createHugeicon(ArrowUp01Icon, 'ChevronUp')
export const Circle = createHugeicon(HugeCircleIcon, 'Circle')
export const CircleAlert = AlertCircle
export const CircleCheck = Check
export const CircleIcon = Circle
export const CircleQuestionMark = createHugeicon(
  HelpCircleIcon,
  'CircleQuestionMark'
)
export const ClockIcon = createHugeicon(Clock01Icon, 'ClockIcon')
export const Cloud = createHugeicon(CloudIcon, 'Cloud')
export const Code = createHugeicon(CodeIcon, 'Code')
export const Code2 = Code
export const CodeSquareIcon = createHugeicon(
  HugeCodeSquareIcon,
  'CodeSquareIcon'
)
export const Coins = createHugeicon(CoinsDollarIcon, 'Coins')
export const Command = createHugeicon(CodeIcon, 'Command')
export const Construction = createHugeicon(Wrench01Icon, 'Construction')
export const Copy = createHugeicon(Copy01Icon, 'Copy')
export const CopyIcon = Copy
export const CpuIcon = createHugeicon(AiBrain01Icon, 'CpuIcon')
export const CreditCard = createHugeicon(CreditCardIcon, 'CreditCard')
export const Crown = createHugeicon(CrownIcon, 'Crown')
export const Database = createHugeicon(Database01Icon, 'Database')
export const DollarSign = createHugeicon(Dollar01Icon, 'DollarSign')
export const DotIcon = createHugeicon(HugeCircleIcon, 'DotIcon')
export const Download = createHugeicon(Download01Icon, 'Download')
export const Edit = createHugeicon(Edit01Icon, 'Edit')
export const Eraser = createHugeicon(AiMagicIcon, 'Eraser')
export const ExternalLink = createHugeicon(ArrowUpRight01Icon, 'ExternalLink')
export const ExternalLinkIcon = ExternalLink
export const Eye = createHugeicon(EyeIcon, 'Eye')
export const EyeOff = createHugeicon(EyeIcon, 'EyeOff')
export const FileCode = createHugeicon(FileCodeIcon, 'FileCode')
export const FileIcon = createHugeicon(File01Icon, 'FileIcon')
export const FileText = createHugeicon(File01Icon, 'FileText')
export const FileWarning = createHugeicon(AlertCircleIcon, 'FileWarning')
export const Filter = createHugeicon(FilterIcon, 'Filter')
export const Flame = createHugeicon(ZapIcon, 'Flame')
export const FlaskConical = createHugeicon(TestTube01Icon, 'FlaskConical')
export const Gauge = createHugeicon(DashboardSpeed01Icon, 'Gauge')
export const Gift = createHugeicon(GiftIcon, 'Gift')
export const Globe = createHugeicon(GlobalIcon, 'Globe')
export const GlobeIcon = Globe
export const GraduationCapIcon = createHugeicon(
  BookOpenCheckIcon,
  'GraduationCapIcon'
)
export const Grid2X2 = createHugeicon(GridIcon, 'Grid2X2')
export const GripVertical = createHugeicon(HandGripIcon, 'GripVertical')
export const HardDrive = createHugeicon(Database01Icon, 'HardDrive')
export const Hash = createHugeicon(HashtagIcon, 'Hash')
export const Headphones = createHugeicon(HeadphonesIcon, 'Headphones')
export const HeartHandshake = createHugeicon(Shield01Icon, 'HeartHandshake')
export const HeartPulse = createHugeicon(Activity01Icon, 'HeartPulse')
export const HelpCircle = createHugeicon(HelpCircleIcon, 'HelpCircle')
export const Home = createHugeicon(Home01Icon, 'Home')
export const Image = createHugeicon(AiImageIcon, 'Image')
export const ImageIcon = Image
export const Info = createHugeicon(InformationCircleIcon, 'Info')
export const Key = createHugeicon(Key01Icon, 'Key')
export const KeyRound = Key
export const Landmark = createHugeicon(LandmarkIcon, 'Landmark')
export const Languages = createHugeicon(LanguageCircleIcon, 'Languages')
export const Laptop = createHugeicon(LaptopIcon, 'Laptop')
export const Layers = createHugeicon(LayerIcon, 'Layers')
export const Layers3 = createHugeicon(Layers01Icon, 'Layers3')
export const LayersIcon = Layers
export const Layout = createHugeicon(Layout01Icon, 'Layout')
export const LayoutDashboard = createHugeicon(Layout01Icon, 'LayoutDashboard')
export const Lightbulb = createHugeicon(IdeaIcon, 'Lightbulb')
export const Link = createHugeicon(Link01Icon, 'Link')
export const Link2 = Link
export const List = createHugeicon(CheckListIcon, 'List')
export const ListChecks = List
export const ListOrdered = List
export const ListTodo = List
export const Loader2 = createHugeicon(Loading03Icon, 'Loader2')
export const Loader2Icon = Loader2
export const LogIn = createHugeicon(Login01Icon, 'LogIn')
export const LogOut = createHugeicon(Logout01Icon, 'LogOut')
export const Mail = createHugeicon(Mail01Icon, 'Mail')
export const Maximize2 = createHugeicon(Maximize01Icon, 'Maximize2')
export const Megaphone = createHugeicon(Megaphone01Icon, 'Megaphone')
export const Menu = createHugeicon(Menu01Icon, 'Menu')
export const MessageCircle = createHugeicon(Message02Icon, 'MessageCircle')
export const MessageCircleIcon = MessageCircle
export const MessageCircleWarning = createHugeicon(
  AlertCircleIcon,
  'MessageCircleWarning'
)
export const MessageSquare = createHugeicon(Message01Icon, 'MessageSquare')
export const Mic2 = createHugeicon(Mic01Icon, 'Mic2')
export const MicIcon = Mic2
export const Minus = createHugeicon(MinusSignIcon, 'Minus')
export const Monitor = createHugeicon(LaptopIcon, 'Monitor')
export const Moon = createHugeicon(Moon02Icon, 'Moon')
export const MoonStar = Moon
export const MoreHorizontal = createHugeicon(
  MoreHorizontalIcon,
  'MoreHorizontal'
)
export const MousePointerClick = createHugeicon(
  MouseLeftClick02Icon,
  'MousePointerClick'
)
export const Move = createHugeicon(MoveIcon, 'Move')
export const Music = createHugeicon(MusicNote01Icon, 'Music')
export const NotepadTextIcon = createHugeicon(
  NotepadTextDashedIcon,
  'NotepadTextIcon'
)
export const Package = createHugeicon(Package01Icon, 'Package')
export const Paintbrush = createHugeicon(PaintBrush01Icon, 'Paintbrush')
export const Palette = createHugeicon(ColorsIcon, 'Palette')
export const PanelTopOpen = createHugeicon(PanelLeftOpenIcon, 'PanelTopOpen')
export const PaperclipIcon = createHugeicon(AttachmentIcon, 'PaperclipIcon')
export const Pencil = createHugeicon(PencilEdit01Icon, 'Pencil')
export const PieChart = createHugeicon(PieChartIcon, 'PieChart')
export const Play = createHugeicon(PlayCircleIcon, 'Play')
export const Plus = createHugeicon(Add01Icon, 'Plus')
export const PlusCircle = createHugeicon(AddCircleIcon, 'PlusCircle')
export const PlusIcon = Plus
export const Power = createHugeicon(PowerServiceIcon, 'Power')
export const PowerOff = Power
export const Presentation = createHugeicon(Presentation01Icon, 'Presentation')
export const QrCode = createHugeicon(QrCodeIcon, 'QrCode')
export const Radio = createHugeicon(Radio01Icon, 'Radio')
export const RadioTower = createHugeicon(Radio01Icon, 'RadioTower')
export const Receipt = createHugeicon(ReceiptTextIcon, 'Receipt')
export const RefreshCcw = createHugeicon(ReloadIcon, 'RefreshCcw')
export const RefreshCcwIcon = RefreshCcw
export const RefreshCw = createHugeicon(RefreshIcon, 'RefreshCw')
export const RotateCcw = RefreshCcw
export const RotateCw = RefreshCw
export const Route = createHugeicon(Route02Icon, 'Route')
export const Save = createHugeicon(FloppyDiskIcon, 'Save')
export const ScanEye = createHugeicon(AiScanIcon, 'ScanEye')
export const Scissors = createHugeicon(ScissorIcon, 'Scissors')
export const ScreenShareIcon = createHugeicon(
  LaptopIcon,
  'ScreenShareIcon'
)
export const ScrollText = createHugeicon(Scroll01Icon, 'ScrollText')
export const Search = createHugeicon(Search01Icon, 'Search')
export const SearchIcon = Search
export const Send = createHugeicon(SentIcon, 'Send')
export const SendIcon = Send
export const Server = createHugeicon(ServerStack01Icon, 'Server')
export const Settings = createHugeicon(Settings01Icon, 'Settings')
export const Settings2 = Settings
export const Share2 = createHugeicon(Share01Icon, 'Share2')
export const Shield = createHugeicon(Shield01Icon, 'Shield')
export const ShieldAlert = createHugeicon(AlertCircleIcon, 'ShieldAlert')
export const ShieldCheck = createHugeicon(ShieldKeyIcon, 'ShieldCheck')
export const Shuffle = createHugeicon(ShuffleIcon, 'Shuffle')
export const Sigma = createHugeicon(CodeIcon, 'Sigma')
export const SlidersHorizontal = createHugeicon(
  SlidersHorizontalIcon,
  'SlidersHorizontal'
)
export const SortAsc = createHugeicon(Sorting01Icon, 'SortAsc')
export const Sparkles = createHugeicon(AiMagicIcon, 'Sparkles')
export const Square = createHugeicon(HugeSquareIcon, 'Square')
export const SquareIcon = Square
export const Sun = createHugeicon(Sun01Icon, 'Sun')
export const Table = createHugeicon(Table01Icon, 'Table')
export const Table2 = Table
export const Tag = createHugeicon(Tag01Icon, 'Tag')
export const Tags = Tag
export const Telescope = createHugeicon(Search01Icon, 'Telescope')
export const Terminal = createHugeicon(TerminalIcon, 'Terminal')
export const TerminalSquare = Terminal
export const TestTube = createHugeicon(TestTube01Icon, 'TestTube')
export const Ticket = createHugeicon(Tag01Icon, 'Ticket')
export const Timer = createHugeicon(Timer01Icon, 'Timer')
export const Trash2 = createHugeicon(Delete02Icon, 'Trash2')
export const TrendingDown = createHugeicon(AnalyticsDownIcon, 'TrendingDown')
export const TrendingUp = createHugeicon(AnalyticsUpIcon, 'TrendingUp')
export const Trophy = createHugeicon(Award01Icon, 'Trophy')
export const Type = createHugeicon(TypeCursorIcon, 'Type')
export const Unlink = createHugeicon(Unlink01Icon, 'Unlink')
export const Upload = createHugeicon(Download01Icon, 'Upload')
export const User = createHugeicon(UserIcon, 'User')
export const UserCog = createHugeicon(UserCircleIcon, 'UserCog')
export const UserRound = User
export const Users = createHugeicon(UserGroup02Icon, 'Users')
export const Video = createHugeicon(Video01Icon, 'Video')
export const Wallet = createHugeicon(Wallet01Icon, 'Wallet')
export const WalletCards = Wallet
export const Wand2 = createHugeicon(AiMagicIcon, 'Wand2')
export const WandSparkles = Wand2
export const Webhook = createHugeicon(WebhookIcon, 'Webhook')
export const WifiOff = createHugeicon(WifiOff01Icon, 'WifiOff')
export const Workflow = createHugeicon(WorkflowCircle01Icon, 'Workflow')
export const Wrench = createHugeicon(Wrench01Icon, 'Wrench')
export const WrenchIcon = createHugeicon(Wrench01Icon, 'WrenchIcon')
export const X = createHugeicon(Cancel01Icon, 'X')
export const XCircle = createHugeicon(CancelCircleIcon, 'XCircle')
export const XCircleIcon = XCircle
export const XIcon = X
export const Zap = createHugeicon(ZapIcon, 'Zap')
export const ZoomIn = createHugeicon(ZoomInAreaIcon, 'ZoomIn')

export function createLucideIcon(
  iconName: string,
  _iconNode: unknown
): LucideIcon {
  return createHugeicon(BotIcon, iconName)
}
