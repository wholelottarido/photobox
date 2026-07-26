insert into public.photobox_themes(slug,name,description,configuration) values
('classic','Classic','Putih bersih dan abadi','{"background":"#fffaf4","textColor":"#221d1a","title":"TOGETHER, ANYWHERE","borderWidth":24,"gap":12}'),
('pink-love','Pink Love','Merah muda playful','{"background":"#ffe7ee","textColor":"#2a1520","title":"BESTIES FOREVER ♥","borderWidth":24,"gap":12}'),
('film-001','Film 001','Nuansa contact sheet','{"background":"#171717","textColor":"#f5e9d8","title":"FILM 001","borderWidth":28,"gap":10}'),
('vintage','Vintage','Warna hangat nostalgia','{"background":"#e5c9a5","textColor":"#3c291d","title":"GOOD TIMES","borderWidth":30,"gap":14}'),
('black-white','Black & White','Monokrom editorial','{"background":"#f2f2f2","textColor":"#111111","title":"US, IN MONO","grayscale":true,"borderWidth":26,"gap":12}')
on conflict(slug) do update set name=excluded.name,description=excluded.description,configuration=excluded.configuration;
