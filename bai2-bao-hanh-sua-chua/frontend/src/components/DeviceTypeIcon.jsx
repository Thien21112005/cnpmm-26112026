import { Cpu, Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';

export function DeviceTypeIcon({ type, size = 15 }) {
  switch (type) {
    case 'Điện thoại':
      return <Smartphone size={size} aria-hidden="true" />;
    case 'Laptop':
      return <Laptop size={size} aria-hidden="true" />;
    case 'Máy tính bàn':
      return <Monitor size={size} aria-hidden="true" />;
    case 'Máy tính bảng':
      return <Tablet size={size} aria-hidden="true" />;
    default:
      return <Cpu size={size} aria-hidden="true" />;
  }
}

