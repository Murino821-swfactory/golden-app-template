/**
 * icons.ts — the schema's icon ids, drawn. Explicit imports keep the bundle to forty icons.
 * `Record<IconId, …>` makes a missing id a type error; tests/icons.spec.ts makes an extra one
 * a test failure.
 */
import {
  BookOpen, Briefcase, Building2, Calendar, Camera, ChartLine, Clock, CreditCard, Dumbbell,
  FileText, Funnel, Gavel, Globe, GraduationCap, Heart, House, Leaf, ListChecks, Mail, MapPin,
  MessageSquare, Package, PawPrint, Phone, Receipt, Route, Scale, Search, ShieldCheck,
  ShoppingCart, Star, Stethoscope, Tag, Target, Timer, Trophy, Truck, Users, Wallet, Bell,
  type LucideIcon,
} from "lucide-react";
import type { IconId } from "./prototype-config";

export const ICONS: Record<IconId, LucideIcon> = {
  "book-open": BookOpen,
  calendar: Calendar,
  "map-pin": MapPin,
  bell: Bell,
  "chart-line": ChartLine,
  "list-checks": ListChecks,
  users: Users,
  wallet: Wallet,
  receipt: Receipt,
  "shield-check": ShieldCheck,
  clock: Clock,
  search: Search,
  funnel: Funnel,
  "file-text": FileText,
  "message-square": MessageSquare,
  mail: Mail,
  phone: Phone,
  camera: Camera,
  heart: Heart,
  star: Star,
  trophy: Trophy,
  target: Target,
  truck: Truck,
  package: Package,
  "shopping-cart": ShoppingCart,
  "credit-card": CreditCard,
  "graduation-cap": GraduationCap,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  leaf: Leaf,
  "paw-print": PawPrint,
  house: House,
  "building-2": Building2,
  briefcase: Briefcase,
  route: Route,
  timer: Timer,
  scale: Scale,
  gavel: Gavel,
  globe: Globe,
  tag: Tag,
};
