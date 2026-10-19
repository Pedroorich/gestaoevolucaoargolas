import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getHomeActionsForProfile } from './home-actions';

export const LogisticaHome: React.FC = () => {
  const actions = getHomeActionsForProfile('logistica');

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return <ShoppingBag className="w-8 h-8 text-brand-black" />;
      case 'Clock':
      default:
        return <Clock className="w-8 h-8 text-brand-blue" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-black">
          Centro de Logística & Entregas
        </h1>
        <p className="text-gray-600 text-lg mt-1">
          O que você gostaria de registrar agora?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {actions.map((act) => (
          <Link key={act.id} href="/vendas" className="block focus:outline-none">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.99] border-2 ${
                act.variant === 'primary'
                  ? 'border-brand-orange bg-orange-50/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-5">
                <div
                  className={`p-4 rounded-2xl shrink-0 ${
                    act.variant === 'primary' ? 'bg-brand-orange' : 'bg-blue-100'
                  }`}
                >
                  {getIcon(act.icon)}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-brand-black">
                    {act.label}
                  </h2>
                  <p className="text-gray-600 text-base md:text-lg mt-0.5">
                    {act.descricao}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LogisticaHome;
