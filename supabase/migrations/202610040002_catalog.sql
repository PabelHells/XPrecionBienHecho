-- Catalog only: no fictional clinicians, appointments, patients or prices.
insert into public.areas(name) values ('Tomografía'),('Ultrasonido'),('Biopsias'),('Radiología');
insert into public.services(area_id,name,description)
select a.id,s.name,s.description from (values
 ('Tomografía','Tomografía axial multicorte','Estudio de imagen por cortes para la evaluación de estructuras internas.'),
 ('Tomografía','Angiotomografía','Evaluación por imagen de los vasos sanguíneos.'),
 ('Ultrasonido','Ultrasonido','Estudios mediante ondas de sonido.'),
 ('Ultrasonido','Ultrasonido Doppler color y espectral','Evaluación del flujo sanguíneo mediante ultrasonido.'),
 ('Ultrasonido','Elastografía hepática','Evaluación de la rigidez del tejido hepático.'),
 ('Ultrasonido','Ultrasonido 2D y 4D','Visualización de estructuras mediante ultrasonido.'),
 ('Ultrasonido','Ultrasonido musculoesquelético','Evaluación de músculos, tendones y articulaciones.'),
 ('Biopsias','Biopsia de tiroides','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Biopsias','Biopsia de próstata','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Biopsias','Biopsia de mama','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Radiología','Rayos X','Estudios radiográficos para evaluación diagnóstica.'),
 ('Radiología','Cistograma miccional','Estudio contrastado de las vías urinarias.'),
 ('Radiología','Uretrograma','Estudio radiográfico contrastado de la uretra.'),
 ('Radiología','Colon por enema','Estudio contrastado del colon.'),
 ('Radiología','Serie esófago-gastro-duodenal','Estudio contrastado del tracto digestivo superior.'),
 ('Radiología','Fistulografía','Evaluación radiográfica de trayectos fistulosos.')
) as s(area,name,description) join public.areas a on a.name=s.area;
