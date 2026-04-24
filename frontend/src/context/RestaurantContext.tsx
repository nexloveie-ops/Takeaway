import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RestaurantInfo {
  nameZh: string;
  nameEn: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  logoUrl: string;
  loading: boolean;
}

const defaultInfo: RestaurantInfo = {
  nameZh: '',
  nameEn: '',
  address: '',
  phone: '',
  website: '',
  email: '',
  logoUrl: '',
  loading: true,
};

const RestaurantContext = createContext<RestaurantInfo>(defaultInfo);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<RestaurantInfo>(defaultInfo);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => {
        const nameZh = data.restaurant_name_zh || '';
        const nameEn = data.restaurant_name_en || '';
        setInfo({
          nameZh,
          nameEn,
          address: data.restaurant_address || '',
          phone: data.restaurant_phone || '',
          website: data.restaurant_website || '',
          email: data.restaurant_email || '',
          logoUrl: data.restaurant_logo || '',
          loading: false,
        });
        // Set page title dynamically
        if (nameZh && nameEn) {
          document.title = `${nameZh} ${nameEn}`;
        } else if (nameZh || nameEn) {
          document.title = nameZh || nameEn;
        }
      })
      .catch(() => setInfo(prev => ({ ...prev, loading: false })));
  }, []);

  return (
    <RestaurantContext.Provider value={info}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
