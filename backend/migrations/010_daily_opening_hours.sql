delete from opening_hours where parent_id='appointments';

insert into opening_hours (id,parent_id,position,map_key,opens_at,closes_at) values
 ('opening-hours-monday','appointments',0,'monday',7.5,21),
 ('opening-hours-tuesday','appointments',1,'tuesday',7.5,21),
 ('opening-hours-wednesday','appointments',2,'wednesday',7.5,21),
 ('opening-hours-thursday','appointments',3,'thursday',7.5,21),
 ('opening-hours-friday','appointments',4,'friday',7.5,24),
 ('opening-hours-saturday','appointments',5,'saturday',8.5,24),
 ('opening-hours-sunday','appointments',6,'sunday',9,18);
