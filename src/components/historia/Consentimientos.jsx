// src/components/historia/Consentimientos.jsx
import React, { useState, useEffect } from 'react';
import FirmaCanvas from './FirmaCanvas';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { P, BD, WA, MU, DN, MT, LT, GL } from '../../utils/constants';
import { getPreamble } from '../../utils/helpers';
import { supabase } from '../../supabase';
import useSignedUrl from '../../utils/useSignedUrl';
import { rutaPerfil } from '../../utils/storage';

const DOCS = [
  {
    id: 'rehabilitacion', title: 'Rehabilitación Oral', categoria: 'General',
    subtitle: 'Anestesia · Extracciones · Empastes · Endodoncia · Prótesis',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO EN REHABILITACIÓN ORAL\n\n${getPreamble(p)}\n\nDECLARO\n\nQue para la realización el Cirujano Dentista ${nombreDoctor}\nme ha explicado que es conveniente en mi situación proceder a realizar un tratamiento de rehabilitación\noral que puede precisar distintos tipos de técnicas y tratamientos entre ellos:\n\n 1.- ANESTESIA LOCAL. Me ha explicado que el tratamiento que voy a recibir implica la administración de\nanestesia local, que consiste en proporcionar, mediante una inyección, sustancias que provocan un\nbloqueo reversible de los nervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin\nde realizar el tratamiento sin dolor.\n\nMe ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que normalmente\nvan a desaparecer en dos o tres horas.\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico, asfixia y que en casos extremos puede requerir tratamiento urgente.\n\n2.- EXTRACCIONES SIMPLES. La intervención consiste en la aplicación de un fórceps a la corona,\npracticando la luxación con movimientos de lateralidad, de manera que pueda desprenderse fácilmente\ndel alvéolo donde está insertada.\n\nAunque se me realizarán los medios diagnósticos que se estimen convenientes, comprendo que es\nposible que el estado inflamatorio del diente que se me vaya a extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y/o antiinflamatorios, del mismo modo que\nen el curso del procedimiento puede producirse una hemorragia, que exigiría, para cohibirla, la\ncolocación en el alvéolo de una sustancia o de sutura. También sé que en el curso del procedimiento de\nla extracción se pueden producir, aunque no es frecuente, la rotura de la corona, heridas en la mucosa\nde la mejilla o en la lengua, inserción de la raíz en el seno maxilar, fractura del maxilar o de la\ntuberosidad, que no dependen de la forma o modo de practicarse la intervención, ni de su correcta\nrealización, sino que son imprevisibles, en cuyo caso el facultativo tomará las medidas precisas u\ncontinuará con la extracción.\n\n3.- OBTURACIONES O EMPASTES. El propósito principal de esta intervención es restaurar los tejidos\ndentarios duros y proteger la pulpa, para conservar el diente o molar y su función, restableciendo al\ntiempo, siempre que sea posible, la estética adecuada. La intervención consiste en limpiar la cavidad de\ntejido cariado y reblandecido y rellenarla posteriormente para conseguir un sellado hermético,\nconservando el diente o molar.\n\nEl Dentista me ha advertido que es frecuente que se produzca una mayor sensibilidad, sobre doto al\nfrío, que normalmente desaparecerá de modo espontáneo.\n\nTambién me ha recomendado que vuelva a visitarle si advierto signos de movilidad o alteraciones de\nla oclusión, pues en ese caso sería preciso ajustar la oclusión, para aliviar el dolor y para impedir la\nformación de una enfermedad periodontal y/o trauma.\n\nComprendo que el sellado hermético puede reactivar procesos infecciosos que hagan necesaria la\nendodoncia y que, especialmente si la caries es profunda, el diente o molar quedar frágil y podrá ser\nnecesario llevar a cabo otro tipo de reconstrucción o colocar una funda protésica.\n\nTambién comprendo que es posible que no me encuentre satisfecho con la forma u el color del diente\ntras el tratamiento porque las cualidades de los empastes nunca serán idénticos a su aspecto sano.\n\n4.- ENDODONCIA. El propósito principal de esta intervención es la eliminación del tejido pulpar\n(conocido vulgarmente por el nervio del diente) inflamado o infectado, o de un proceso granulomatoso\no quístico. La intervención consiste en la eliminación del tejido enfermo y rellenar la cámara pulpar y\nlos tejidos radiculares con un material que selle la cavidad e impida el paso a las bacterias y toxinas\ninfecciosas, conservando el diente o molar. El Dentista me ha advertido que, a pesar de realizarse\ncorrectamente la técnica, cabe la posibilidad de que la infección o el proceso quístico o granulomatoso\nno se eliminen totalmente, por lo que puede ser necesario acudir a la cirugía del ápice radicular, llamada\napicectomía al cabo de algunas semanas, meses o incluso años.\n\nA pesar de realizarse correctamente la técnica, es posible que no se obtenga el relleno total de los\nconductos, por lo que también puede ser necesario proceder a una reendodoncia, como en el caso de\nque el relleno quede corto o largo.\n\nEl Dentista me ha advertido que es muy posible que después de la endodoncia el diente cambie de color\nu se oscurezca ligeramente.\n\nTambién sé que es frecuente que el diente/molar en que se realice la endodoncia se debilite y tienda a\nfracturarse, por lo que puede ser necesario realizar coronas protésicas e insertar refuerzos dentro de la\nraíz llamados espigos.\n\n5.- PRÓTESIS. Me ha explicado el Dentista, la necesidad de tallar los pilares de la prótesis, lo que\nconlleva la posibilidad de aproximación excesiva a la cámara pulpar (nervio) que nos obligaría a realizar\nuna endodoncia y en algunos casos si el muñón quedase frágil, a realizar un espigo colado o de fibra.\n\nTambién se me ha explicado la necesidad de mantener una higiene escrupulosa para evitar el desarrollo\nde, caries, gingivitis y secundariamente enfermedad periodontal.\n\nAsimismo, se me informa de la importancia de visitas periódicas (entre 6 meses y un año) para controlar\nla situación de la prótesis y su entorno.\n\nPor otro lado, se me aclaró que existe la posibilidad de fractura de cualquiera de los componentes de\nla prótesis, muy relacionada con en el uso que yo haga de la misma.\n\nEl Dentista me ha explicado que todo acto odontológico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de rehabilitación oral.\n\nA ${fecha}`
  },
  {
    id: 'exodoncia_simple', title: 'Exodoncia Simple', categoria: 'Extracción',
    subtitle: 'Extracción de una o más piezas dentarias',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA LA EXODONCIA SIMPLE\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi\nsituación realizar la extracción de una o más piezas dentarias:\n\n1.- En consecuencia, comprendo que no mantendré esa o esas piezas dentarias y que, únicamente, podrá\nser sustituido por una prótesis o implante. Que podría recurrir a técnicas conservadoras como la\nperiodoncia o la endodoncia, y las descarto por el estado que presenta, y que no hace razonable su\nconservación.\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Asimismo, me ha explicado que tendré la sensación de adormecimiento del labio o de la cara,\nque normalmente van a desaparecer en dos o tres horas. También me explicó que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar bajada de tensión que, en casos menos\nfrecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse posteriormente, e,\nincluso, excepcionalmente, la muerte. Comprendo que, aunque de mis antecedentes personales no se\ndeducen posibles alergias o alergia al agente anestésico, la anestesia puede provocar urticaria,\ndermatitis, asma, edema angioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en el empleo alternado de instrumental especializado quirúrgico, aplicando\nfuerza manual, de leve a moderada, cuya finalidad es movilizar y finalmente extraer del alveolo la pieza\no piezas dentales problema.\n\n4.- Aunque se me han realizado los medios diagnósticos que se han estimado precisos, comprendo que\nes posible que el estado inflamatorio del diente/molar que se me va a extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y/o antiinflamatorios, del mismo modo que\nen el curso del procedimiento puede producirse una hemorragia, que exigiría, para cohibirla, la\ncolocación en el alvéolo de una torunda de algodón seca u otro producto hemostático, incluso sutura.\nTambién sé que en el curso del procedimiento pueden producirse, aunque no es frecuente, la rotura de\nla corona, heridas en la mucosa de la mejilla o en la lengua, intrusión de la raíz en el seno maxilar,\nfractura del maxilar, que no dependen de la forma o modo de practicarse la intervención, ni de su\ncorrecta realización, sino que son imprevisibles, en cuyo caso el cirujano dentista tomará las medidas\npertinentes para continuar con el tratamiento.\n\n5.- Mi dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de extracción simple.\n\nA ${fecha}`
  },
  {
    id: 'tercera_molar', title: 'Exodoncia Tercera Molar', categoria: 'Extracción',
    subtitle: 'Extracción de cordal / muela de juicio',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA LA EXODONCIA DE LA TERCERA MOLAR\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi\nsituación proceder a la extracción de un cordal o muela de juicio por los síntomas y signos que\nmanifiesto. Entiendo que el objetivo del procedimiento consiste en conseguir eliminar los problemas y\ncomplicaciones que su mantenimiento en la boca pueda ocasionar.\n\nMe ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en dos o tres horas.\n\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca la baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\nAunque se me han practicado los medios diagnósticos que se han estimado necesarios, comprendo que\nes posible que el estado inflamatorio de la pieza que se me va extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y antiinflamatorios.\n\nTambién sé que en el curso del procedimiento pueden producirse, aunque no es frecuente: la rotura de\nla corona, laceraciones en la mucosa yugal o en la lengua, inserción de la raíz en el seno maxilar, fractura\ndel tabique intrarradicular o de la tuberosidad, que no dependen de la forma o modo de practicarse la\nintervención, ni de su correcta realización, sino que son imprevisibles, en cuyo caso el cirujano dentista\ntomará las medidas precisas, y continuará con la extracción.\n\nSe me informa también que, aunque no es frecuente, puede producirse luxación de la articulación de la\nmandíbula e incluso fractura del maxilar, en cuyo caso deberé recibir el tratamiento preciso con un\nespecialista en esa materia y ser revisado para control de ese proceso.\n\nTambién se me ha explicado que, aunque infrecuentemente, y con independencia de la técnica empleada\nen el procedimiento y de su correcta realización, pueden lesionarse el nervio dentario o el nervio lingual,\ncon pérdida de sensibilidad que normalmente es temporal y desaparece en algunas semanas, pero que\npuede perdurar durante tres a seis meses, o ser definitiva.\n\nMenos graves resultan las complicaciones infecciosas locales, celulitis, trismo, estomatitis, etc., que\nsuelen poder controlarse farmacológicamente pero que pueden precisar de tratamiento quirúrgico\nposterior.\n\nHe comprendido que, como alternativa a la extracción del molar de juicio, podría recurrir a técnicas\nconservadoras como la endodoncia y la periodoncia, que descarto por su estado.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique la extracción de la tercera molar.\n\nA ${fecha}`
  },
  {
    id: 'endodoncia', title: 'Endodoncia', categoria: 'Endodoncia',
    subtitle: 'Tratamiento de conductos radiculares',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA ENDODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi situación proceder\na realizar el tratamiento endodóntico de mi pieza dentaria, para los que me ha informado debidamente\nde lo siguiente:\n\n1. El propósito principal de la intervención es la eliminación del tejido pulpar inflamado o infectado,\ndel interior del diente para evitar secuelas dolorosas o infecciosas.\n\n2. El tratamiento que voy a recibir implica la administración de anestesia local, que consiste en\nproporcionar, mediante una inyección, sustancias que provocan el bloqueo reversible de los nervios de\ntal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento sin dolor.\nMe ha explicado también que tendré la sensación de adormecimiento del labio o de la cara que\nnormalmente va a desaparecer en dos o tres horas.\n\nIgualmente me ha explicado que la administración de la anestesia puede provocar, en el punto en el que\nse administre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca bajada de tensión que, más infrecuentemente, pueden provocar un síncope o fibrilación\nventricular, que deben tratarse posteriormente, e incluso, excepcionalmente, la muerte. También puede\nprovoca la administración de anestesia urticaria, dermatitis, asma, edema angioneurótico, es decir\nasfixia, que en casos extremos puede requerir tratamiento urgente.\n\n3. La intervención consiste en la eliminación y el relleno de la cámara pulpar y los tejidos radiculares\ncon un material que selle la cavidad e impida el paso a las bacterias y toxinas infecciosas, conservando\nel diente o molar.\n\n4. Se me ha informado, que, a pesar de realizar correctamente la técnica, cabe la posibilidad de que la\ninfección o el proceso quístico o granulomatoso no se eliminen totalmente, por lo que puede ser\nnecesario acudir a la cirugía periapical al cabo de algunas semanas, meses o incluso años. Igualmente\nes posible que no se obtenga el relleno total de los conductos, por lo que también puede ser necesario\nproceder a una repetición del tratamiento, como en el caso de que el relleno quede corto o largo.\n\nTambién me ha advertido que es muy posible que después de la endodoncia el diente cambie de color y\nse oscurezca ligeramente. Y me ha indicado que es frecuente que el diente o molar en el que se ha\nrealizado la endodoncia se debilite y tienda a fracturarse, por lo que puede ser necesario realizar coronas\nprotésicas e insertar refuerzos interradiculares.\n\n5. Me ha informado de que todo acto quirúrgico que lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado mi cirujano dentista de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de endodoncia.\n\nA ${fecha}`
  },
  {
    id: 'implantes', title: 'Implantes Dentales', categoria: 'Prótesis',
    subtitle: 'Reposición de dientes con fijación al hueso',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA IMPLANTES DENTALES\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que el propósito de la intervención es la\nreposición de los dientes perdidos mediante la fijación de tornillos o láminas al hueso, y posteriormente\nla colocación de un/ospilar/es metálico/s que soportará las futuras piezas dentales artificiales.\n\nHe sido informado/a de otras alternativas de tratamiento mediante la utilización de prótesis\nconvencionales. Para llevar a cabo el procedimiento se aplicará anestesia, de cuyos posibles riesgos\ntambién he sido informado/a. Igualmente se me ha informado de que existen ciertos riesgos potenciales\nen toda intervención quirúrgica realizada en la boca, concretamente:\n\n1. Alergia al anestésico, antes, durante o después de la cirugía.\n2. Molestias, hematomas e inflamación postoperatoria, durante los primeros días.\n3. Sangrado.\n4. Infección postoperatoria que requiera tratamiento posterior.\n5. Lesión de raíces de dientes adyacentes.\n6. Lesión nerviosa que provoque hipoestesia o anestesia del labio inferior, superior, mentón, dientes,\n   encía y/o de la lengua, que sueles ser transitoria y excepcionalmente permanente.\n7. Comunicación con los senos nasales o con las fosas nasales.\n8. Aspiración o deglución de algún instrumento quirúrgico de pequeño tamaño.\n9. Desplazamiento del implante a estructuras vecinas.\n10. Rotura de instrumentos.\n\nLos implantes han sido utilizados ampliamente en todo el mundo, desde hace más de 25 años y es un\nprocedimiento considerado seguro por la comunidad internacional, pero se me ha explicado que, aunque\nla técnica se realice correctamente, existe un porcentaje de fracasos entre el 8 y el 10 por ciento.\n\nHe sido informado de las complicaciones potenciales de este procedimiento quirúrgico:\n1. Dehiscencia de sutura y exposición del implante.\n2. Falta de integración del implante con el hueso que lo rodea.\n3. Imposibilidad de colocar un implante en la localización prevista.\n4. En casos excepcionales, puede producirse una fractura mandibular.\n5. Fractura del implante o de algún componente de la prótesis.\n6. Complicaciones inherentes a la prótesis dental.\n\nEntiendo que el tratamiento no concluye con la colocación del implante, sino que será preciso visitar\nperiódicamente al facultativo y seguir escrupulosamente las normas de higiene que me ha explicado.\n\nHe comprendido lo que se me ha explicado por el facultativo de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de implantes.\n\nA ${fecha}`
  },
  {
    id: 'ortodoncia', title: 'Ortodoncia', categoria: 'Ortodoncia',
    subtitle: 'Aparatología fija o removible',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA ORTODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi situación proceder\na realizar un tratamiento ortodóntico, con objeto de conseguir una mejor alineación de los dientes, para\nde esta manera prevenir problemas posteriores, mejorando a la vez la masticación y la estética.\n\nPara ello se emplean aparatos de ortodoncia que pueden ser removibles o fijos.\n\nSe que es es posible que los aparatos removibles se pierdan fácilmente si no están en la boca, y que en\neste caso el coste de reposición correrá por mi cuenta.\nEl Dentista me ha explicado que los aparatos pueden producir úlceras o llagas, dolor en los dientes que\nestán con los aparatos y que es frecuente que con el tiempo se produzca reabsorción de las raíces, de\nmanera que estas queden más pequeñas, así como la disminución de las encías, que pueden requerir\ntratamiento posterior. También me ha explicado el Dentista que el tratamiento puede requerir la\nextracción de algún o algunos dientes sanos, incluso puede ser necesario la extracción de las muelas\ndel juicio.\n\nTambién sé que el tratamiento ortodóntico puede ser largo en el tiempo, meses e incluso años, lo que\nno depende de la técnica empleada ni de su correcta realización sino de factores generalmente\nbiológicos, y de la respuesta de mi organismo, totalmente impredecibles, y que durante todo este tiempo\ndeberé extremar las medidas de higiene de la boca para evitar caries y enfermedad de las encías.\n\nEl Dentista me ha explicado que suspenderá el tratamiento si la higiene no es la adecuada porque corre\ngran riesgo mi dentición de sufrir lesiones cariosas múltiples u otros padecimientos derivados de la\nescasez de higiene oral.\n\nAsimismo, me ha informado que tras la conclusión del tratamiento, se pueden producir algunos\nmovimientos dentarios no deseados y que deberé acudir periódicamente para ser revisado para evitar\nrecaídas.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento. Estoy satisfecho con la información recibida y comprendido el alcance y riesgos\nde este tratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento\nde ortodoncia.\n\nA ${fecha}`
  },
  {
    id: 'protesis_fija', title: 'Prótesis Fija', categoria: 'Prótesis',
    subtitle: 'Coronas cementadas sobre pilares',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA PRÓTESIS FIJA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi\nsituación proceder a realizar el tratamiento de prótesis dental, dándome la siguiente información:\n\nQue para realizar un tratamiento de prótesis dental se me ha explicado la necesidad de tallar los dientes\npilares de la prótesis, lo que puede conllevar la posibilidad de aproximación excesiva a la cámara pulpar\n(nervio) que nos obligaría a realizar un tratamiento de endodoncia y en algunos casos si el muñón queda\nfrágil, a realizar un espigo de fibra o colado.\n\nTambién se me ha explicado la necesidad de mantener una higiene escrupulosa para evitar el desarrollo\nde gingivitis y secundariamente enfermedad periodontal.\n\nAsimismo, se me informa sobre la importancia de visitas periódicas (en principio anuales) para controlar\nla situación de la prótesis y su entorno. Por otro lado, se me ha aclarado que existe la posibilidad de\nfractura de cualquier componente de la prótesis, que implique la reparación o el cambio total de la\nmisma. Si ocurre dentro del periodo de garantía pactado, siempre y cuando se deba al uso adecuado de\nla prótesis (masticación de alimentos), la restauración será asumida por mi dentista, de lo contrario los\ngastos de reparación y honorarios serán asumidos completamente por mi persona.\n\nHe comprendido lo explicado de forma clara, con un lenguaje sencillo, habiendo resuelto todas las dudas\nque se me han planteado, y la información complementaria que le he solicitado. Me queda claro que en\ncualquier momento y sin necesidad de dar ninguna explicación, puedo revocar este consentimiento.\nEstoy satisfecho con la información recibida y he comprendido el alcance y riesgos de este tratamiento,\ny en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de prótesis fija.\n\nA ${fecha}`
  },
  {
    id: 'periodoncia', title: 'Periodoncia', categoria: 'Periodoncia',
    subtitle: 'Tratamiento de tejidos de soporte dental',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA PERIODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente, en mi\nsituación, proceder a realizar un tratamiento periodontal, dándome la siguiente información:\n\n1.- El propósito principal de la intervención es la eliminación de los factores irritativos e infecciosos\npresentes en los tejidos de soporte de los dientes (encía, hueso alveolar, ligamiento periodontal, cemento\nradicular), para conseguir el mantenimiento de los dientes en el tiempo, función y estética, evitando\nmovilidad, pérdida de hueso y caída de los mismos.\n\n 2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local,\nque consiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible\nde los nervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el\ntratamiento sin dolor.\n\nMe ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que normalmente\nvan a desaparecer en dos o tres horas.\n\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca la baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en la eliminación de la placa y cálculo con curetas o ultrasonido, y a las\npocas semanas, de ser necesario, la cirugía de las encías a colgajo para eliminar las bolsas infecciosas,\naumentar el nivel de la encía y/o tratar los defectos óseos.\n\n4.- Aunque se me han practicado los medios diagnósticos que se han estimado convenientes,\ncomprendo que pueden producirse procesos edematosos, hinchazón, dolor o laceraciones en la mucosa\ndel labio o mejilla, o en la lengua, que no dependen de la técnica empleada ni de su correcta realización,\nsino que son imprevisibles, aunque relativamente frecuentes, en cuyo caso el dentista tomará las\nmedidas pertinentes y continuará el tratamiento.\n\nSé que es frecuente que después del tratamiento advierta un aumento de la sensibilidad dentaria u\nmovilidad de los dientes que normalmente desaparecerán bien espontáneamente o por un tratamiento\nposterior.\n\nTambién sé que va a producirse un cierto alargamiento de los dientes, más perceptible al sonreír, como\nconsecuencia segura de haberse eliminado el tejido enfermo e inflamado. Igualmente comprendo que el\ntratamiento puede extenderse incluso hasta un año o más.\n\nMe ha explicado también pormenorizadamente la importancia del cuidado dental y el mantenimiento con\nvisitas periódicas de sesiones de profilaxis e higiene dental, lo que debe realizarse a lo largo de toda la vida.\n\nTambién comprendo que el objetivo perseguido NO SE PUEDA lograr, total o parcialmente, con\nindependencia de la técnica empleada y de su correcta realización, y de que, sin la esmerada contribución\nde mi parte en el control de placa bacteriana, mediante la higiene frecuente, los objetivos perseguidos no\nse puedan cumplir.\n\n5.- El Dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de periodoncia.\n\nA ${fecha}`
  },
  {
    id: 'obturaciones', title: 'Obturaciones / Empastes', categoria: 'General',
    subtitle: 'Restauración de tejidos dentarios duros',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA OBTURACIONES\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que es conveniente en mi\nsituación proceder a realizar una obturación o empaste a un diente o molar, dándome la siguiente\ninformación:\n\n1.- El propósito principal de la intervención es restaurar los tejidos dentarios duros y proteger la pulpa,\npara conservar el diente/molar y su función, restableciendo al momento, siempre que sea posible, la\nestética adecuada.\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en dos o tres horas. También me ha explicado que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar la baja de presión arterial que, en casos\nmenos frecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse\nposteriormente, e, incluso, excepcionalmente, la muerte.\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en eliminar de la cavidad el tejido cariado y rellenarla posteriormente con\nmateriales plásticos adhesivos para conseguir un sellado hermético, conservando la integridad de la\npieza dental.\n\n4.- Mi dentista me ha advertido que es frecuente que se produzca una mayor sensibilidad, sobre todo al\nfrío, que normalmente desaparecerá de modo espontáneo. También me ha recomendado que vuelva a\nla consulta lo más pronto posible, si advierto signos de movilidad o alteraciones de la oclusión (mordida),\npues en ese caso sería preciso ajustarla, para aliviar el dolor y para impedir la formación de una\nenfermedad periodontal y/o trauma.\n\nComprendo que la obturación puede reactivar procesos infecciosos que hagan necesaria la endodoncia\ny que, especialmente si la caries es profunda, el diente/molar quedará frágil y podrá ser necesario llevar\na cabo otro tipo de reconstrucción o colocar una corona protésica. También comprendo que es posible\nque no me encuentre satisfecho con la forma y el color del diente tras el tratamiento, porque las\ncualidades de las restauraciones directas nunca serán idénticas a su aspecto de diente sano.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado. Me ha\nqueda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar este\nconsentimiento. Estoy satisfecho con la información recibida y comprendido el alcance y riesgos de este\ntratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de\nobturación.\n\nA ${fecha}`
  },
  {
    id: 'cirugia_oral', title: 'Cirugía Oral Menor', categoria: 'Cirugía',
    subtitle: 'Extirpación, frenillos, quistes, cirugía preprotésica',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA LA CIRUGÍA ORAL MENOR\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista ${nombreDoctor} me ha explicado que el propósito de la\nintervención de cirugía oral menor es para resolver alguno de los siguientes problemas de la cavidad oral\n(borrar los que no correspondan): extracción de piezas dentarias o restos apicales incluidos,\nfenestración o tracción de dientes retenidos, plastia de frenillos labiales, extirpación de quistes\nmaxilares y pequeños tumores de los mismos o del resto de la cavidad bucal y cirugía preprotésica\nfundamentalmente.\n\nPara llevar a cabo el procedimiento se aplicará anestesia, de cuyos posibles riesgos también he sido\ninformado/a, es posible que los fármacos utilizados puedan producir determinadas alteraciones del nivel\nde conciencia por lo que se me ha informado que no podré realizar determinadas actividades\ninmediatamente, tales como conducir un vehículo.\n\nIgualmente se me ha informado de que existen ciertos riesgos potenciales y complicaciones, algunas\nde ellas inevitables, concretamente:\n\n1.- Alergia al anestésico u otro medicamento utilizado, antes o después de la cirugía.\n2.- Hematoma y edema de la región.\n3.- Hemorragia postoperatoria.\n4.- Dehiscencia de la sutura.\n5.- Daño de dientes adyacentes.\n6.- Hipoestesia o anestesia del nervio dentario inferior, temporal o definitiva.\n7.- Hipoestesia o anestesia del nervio lingual, temporal o definitiva.\n8.- Hipoestesia o anestesia del nervio infraorbitario, temporal o definitiva.\n9.- Infección postoperatoria.\n10.- Osteítis.\n11.- Sinusitis.\n12.- Comunicación buconasal y/o bucosinual.\n13.- Fracturas óseas.\n14.- Rotura de instrumentos.\n\nTras la información recibida, he comprendido la naturaleza y propósitos del tratamiento de cirugía que\nse me va a practicar.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de cirugía.\n\nA ${fecha}`
  },
  {
    id: 'apicectomia', title: 'Apicectomía / Cirugía Periapical', categoria: 'Cirugía',
    subtitle: 'Cirugía del ápice radicular',
    getText: (fecha, p, nombreDoctor) => `CONSENTIMIENTO INFORMADO PARA LA REALIZACIÓN DE APICECTOMÍA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano-Dentista ${nombreDoctor} me ha explicado que es conveniente en mi\nsituación proceder a realizar cirugía periapical a un diente, dándome la siguiente información:\n\n1.- El propósito principal de la intervención es eliminar restos de un proceso infeccioso, (granuloma o\nquiste periapical).\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en unas 2 o 3 horas. También me ha explicado que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar bajada de tensión que, en casos menos\nfrecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse posteriormente, e,\nincluso, excepcionalmente, la muerte. Comprendo que, aunque de mis antecedentes personales no se\ndeducen posibles alergias o hipersensibilidad al agente anestésico, la anestesia puede provocar\nurticaria, dermatitis, asma, edema angioneurótico (asfixia), que en casos extremos puede requerir\ntratamiento urgente.\n\n3.- La intervención consiste en la incisión a nivel de la mucosa, eliminación de la tabla ósea y por la\nventana abierta eliminar el ápice de la raíz enferma. Posteriormente se realizaría un legrado de la región\napical.\n\n4.- Aunque se me han realizado los medios diagnósticos que se han estimado precisos, comprendo que\npueden producirse procesos edematosos, inflamación, dolor, laceraciones en la mucosa de la mejilla o\ndel labio, o en la lengua, que no dependen de la forma o modo de practicarse la intervención, ni de su\ncorrecta realización, sino que son imprevisibles, en cuyo caso el facultativo tomará las medidas precisas\ny continuar el procedimiento. También se ha explicado que, aunque con menos frecuencia, y con\nindependencia de la técnica empleada en el procedimiento y de su correcta realización, puede resultar\nlesionado el nervio dentario de la mandíbula, lo que implica anestesia o insensibilidad alguna zona de la\nboca o la cara que puede ser temporal o definitiva.\n\n5.- El Dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos, y que por mi situación actual pueden aumentar las complicaciones.\n\nHe comprendido lo que se me ha explicado por el facultativo de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado. Me ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación,\npuedo revocar este consentimiento. Estoy satisfecho con la información recibida y comprendido el\nalcance y riesgos de este tratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique\nel tratamiento de apicectomía.\n\nA ${fecha}`
  }
];

function DocModal({ doc, patient, clinica, nombreDoctor, onClose, onGuardar, saved }) {
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);
  const [texto, setTexto] = useState(() => saved ? saved.texto : doc.getText(fecha, patient, nombreDoctor));
  const [firmaP, setFirmaP] = useState(saved?.firmaP || null);
  const [firmaDr, setFirmaDr] = useState(saved?.firmaDr || null);
  const [isSaved, setIsSaved] = useState(!!saved);
  const [saving, setSaving] = useState(false);

  const isMinor = parseInt(patient?.age) < 18;
  const labelFirmaP = isMinor ? "El Apoderado / Representante Legal" : "El Paciente";
  const nameFirmaP = isMinor ? (patient?.apoderado || 'Falta nombre apoderado') : patient?.name;
  const dniFirmaP = isMinor ? (patient?.apoderado_dni || 'Falta DNI') : patient?.doc;

  const guardar = () => {
    if (!firmaP) { alert('El paciente o apoderado debe firmar antes de guardar.'); return; }
    setSaving(true);
    setTimeout(() => {
      onGuardar(doc.id, { texto, firmaP, firmaDr, fecha, titulo: doc.title });
      setIsSaved(true); setSaving(false);
      alert('✓ Consentimiento guardado en la historia clínica');
    }, 500);
  };

  const imprimir = () => {
    // Todo dato variable se escapa antes de entrar al HTML: el nombre y el DNI
    // del paciente son texto libre, y sin escapar permitirían inyectar markup
    // que se ejecutaría en la ventana de impresión con la sesión activa.
    // Escapa también comillas porque firmaP/firmaDr se interpolan en src="...".
    const esc = s => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;color:#000;background:#fff}
      .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 22mm 15mm 22mm;position:relative}
      .side-bar{position:fixed;right:0;top:0;bottom:0;width:8px;display:flex;flex-direction:column}
      .sb1{flex:1;background:#0D5C6B}
      .sb2{height:25px;background:#E1F5F3}
      .sb3{flex:1;background:#7AAFAD;opacity:.7}
      .header-container{display:flex;justify-content:space-between;alignItems:center;padding-bottom:12px;margin-bottom:12px;border-bottom:1.5px solid #C2DFDD}
      .header-left{display:flex;align-items:center;gap:15px}
      .logo-cop-print{width:65px;height:65px;object-fit:contain}
      .header-left-text .inst-cop{font-size:16px;font-weight:bold;color:#5B2D8E}
      .header-left-text .consejo-cop{font-size:11px;color:#666}
      .header-right{display:flex;flex-direction:column;align-items:flex-end}
      .logo-dra-print{width:55px;height:55px;object-fit:contain}
      .header-right-text{font-size:13px;font-weight:bold;color:#0D5C6B;margin-top:5px;fontFamily:serif}
      .title{text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;margin:18px 0 20px;letter-spacing:.5px}
      .body-text{white-space:pre-wrap;font-size:12.5px;line-height:1.85;text-align:justify}
      .firma-section{margin-top:40px;display:flex;justify-content:space-between;gap:50px;padding-top:10px}
      .firma-box{flex:1;text-align:center}
      .firma-line{border-bottom:1px solid #333;height:70px;margin-bottom:6px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px}
      .firma-line img{max-height:66px;max-width:95%;object-fit:contain}
      .firma-name{font-size:11px;color:#333}
      .cop-footer{margin-top:30px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.side-bar{position:fixed}}
    </style></head><body>
      <div class="side-bar"><div class="sb1"></div><div class="sb2"></div><div class="sb3"></div></div>
      <div class="page">
        <div class="header-container">
          <div class="header-left">
            <img src="/logo_web.png" alt="Logo COP" class="logo-cop-print" />
            <div class="header-left-text">
              <div class="inst-cop">Colegio Odontológico del Perú</div>
              <div class="consejo-cop">Consejo Administrativo Nacional</div>
            </div>
          </div>
          <div class="header-right">
            ${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="${esc(nombreDoctor)}" class="logo-dra-print" />` : ''}
            <div class="header-right-text">${esc(clinica?.nombre || nombreDoctor)}</div>
          </div>
        </div>
        <div class="title">${esc(doc.title)}</div>
        <div class="body-text">${esc(texto)}</div>
        <div class="firma-section">
          <div class="firma-box">
            <div class="firma-line">${firmaP ? `<img src="${esc(firmaP)}"/>` : '&nbsp;'}</div>
            <div class="firma-name">${esc(labelFirmaP)}<br><strong>${esc(nameFirmaP)}</strong><br>DNI: ${esc(dniFirmaP)}</div>
          </div>
          <div class="firma-box">
            <div class="firma-line">${firmaDr ? `<img src="${esc(firmaDr)}"/>` : '&nbsp;'}</div>
            <div class="firma-name">El Odontólogo / Estomatólogo<br><strong>${esc(nombreDoctor)}</strong>${clinica?.cop ? `<br>COP ${esc(clinica.cop)}` : ''}</div>
          </div>
        </div>
        <div class="cop-footer">${esc([clinica?.direccion, clinica?.telefono].filter(Boolean).join(' · '))}</div>
      </div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  return (
    <Modal
      background="rgba(0,0,0,.6)"
      zIndex={3000}
      overlayStyle={{ padding: 10 }}
      cardStyle={{ borderRadius: 10, width: '100%', maxWidth: 820, maxHeight: '96dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.35)', position: 'relative' }}>

        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div style={{ flex: 1, background: P }} />
          <div style={{ height: 28, background: MT }} />
          <div style={{ flex: 1, background: MU, opacity: .7 }} />
        </div>

        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', flexShrink: 0, background: LT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <img src="/logo_web.png" alt="Logo COP" style={{ width: 65, height: 65, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#5B2D8E', fontFamily: 'serif' }}>Colegio Odontológico del Perú</div>
              <div style={{ fontSize: 11, color: '#666', fontFamily: 'serif' }}>Consejo Administrativo Nacional</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {avatarUrl && <img src={avatarUrl} alt={nombreDoctor} style={{ width: 65, height: 65, objectFit: 'contain' }} />}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid #ccc`, borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 14, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 18 }}>×</button>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 40px', background: LT, borderBottom: `1px solid ${BD}`, flexShrink: 0, position: 'relative' }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#222', fontFamily: 'serif', letterSpacing: .4 }}>{doc.title}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2, fontFamily: 'serif' }}>{patient?.name} · DNI {patient?.doc} · {fecha}</div>
          {isSaved && <span style={{ position: 'absolute', right: 16, top: 16, fontSize: 10, fontWeight: 700, background: '#dcfce7', color: WA, padding: '3px 10px', borderRadius: 10, border: `1px solid ${BD}` }}>✓ Guardado</span>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 14px 16px' }}>
          {!isSaved && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 10, color: GL, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 12px', marginBottom: 10, fontFamily: 'sans-serif' }}>
              <Icon name="edit" size={11} style={{ marginTop: 1, flexShrink: 0 }} /> El documento se autocompletó con la información actual del paciente. Si nota algún error, actualice sus datos en el botón "Editar".
            </div>
          )}
          <textarea
            value={texto}
            onChange={e => !isSaved && setTexto(e.target.value)}
            readOnly={isSaved}
            style={{
              width: '100%', minHeight: 380, padding: '16px 18px',
              border: `1px solid ${isSaved ? '#86efac' : '#ccc'}`, borderRadius: 6,
              fontSize: 12.5, lineHeight: 1.9, resize: 'vertical', outline: 'none',
              color: '#111', fontFamily: '"Times New Roman",serif',
              background: isSaved ? '#fafff9' : '#fff', boxSizing: 'border-box',
              textAlign: 'justify'
            }} />

          <div style={{ marginTop: 18, border: `1px solid ${BD}`, borderRadius: 8, padding: 16, background: LT }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P, fontFamily: 'serif', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .3 }}>
              Firmas del documento
            </div>
            <div style={{ fontSize: 10, color: '#666', fontFamily: 'sans-serif', marginBottom: 14 }}>
              {isSaved
                ? 'Documento firmado y guardado. Solo lectura.'
                : 'Firma con el dedo (tablet) o con el mouse.'}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <FirmaCanvas
                label={labelFirmaP}
                sub={`${nameFirmaP} · DNI ${dniFirmaP}`}
                onFirma={isSaved ? null : setFirmaP}
                firmaUrl={firmaP}
                readonly={isSaved} />

              <FirmaCanvas
                label="El Odontólogo / Estomatólogo"
                sub={`${nombreDoctor}${clinica?.cop ? ` · COP ${clinica.cop}` : ''}`}
                onFirma={isSaved ? null : setFirmaDr}
                firmaUrl={firmaDr}
                readonly={isSaved} />
            </div>
            {!firmaP && !isSaved && (
              <div style={{ marginTop: 10, fontSize: 10, color: '#ef4444', fontFamily: 'sans-serif' }}>⚠ Se requiere la firma del paciente/apoderado para guardar.</div>
            )}
          </div>
        </div>

        <div style={{ padding: '10px 20px 10px 16px', borderTop: `1px solid ${BD}`, display: 'flex', gap: 8, flexShrink: 0, background: LT, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#666', fontWeight: 600 }}>Cerrar</button>
          <div style={{ flex: 1 }} />
          <button onClick={imprimir}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#fff', color: P, border: `1px solid ${P}`, borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            <Icon name="print" size={13} /> Imprimir
          </button>
          {!isSaved && (
            <button onClick={guardar} disabled={saving || !firmaP}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', background: firmaP ? P : '#94a3b8', color: '#fff', border: 'none', borderRadius: 7,
                cursor: firmaP && !saving ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700
              }}>
              <Icon name="save" size={13} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
    </Modal>
  );
}

const CATEGORIA_COLOR = {
  'General': '#0ea5e9',
  'Extracción': '#f43f5e',
  'Endodoncia': '#f59e0b',
  'Prótesis': '#8b5cf6',
  'Ortodoncia': '#06b6d4',
  'Periodoncia': '#10b981',
  'Cirugía': '#64748b',
};
const CATEGORIAS = ['Todas', ...Object.keys(CATEGORIA_COLOR)];

export default function Consentimientos({ patient, clinica }) {
  const [open, setOpen] = useState(null);
  const [guardados, setGuardados] = useState({});
  const [nombreDoctor, setNombreDoctor] = useState('El Odontólogo');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);
  const guardar = (id, data) => setGuardados(p => ({ ...p, [id]: data }));
  const sg = Object.values(guardados).length;

  const busquedaNorm = busqueda.trim().toLowerCase();
  const docsFiltrados = DOCS.filter(c => {
    const matchCategoria = categoriaActiva === 'Todas' || c.categoria === categoriaActiva;
    const matchBusqueda = !busquedaNorm || c.title.toLowerCase().includes(busquedaNorm) || c.subtitle.toLowerCase().includes(busquedaNorm);
    return matchCategoria && matchBusqueda;
  });

  useEffect(() => {
    let vivo = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!vivo) return;
      const nombre = data?.user?.user_metadata?.full_name || data?.user?.email;
      if (nombre) setNombreDoctor(nombre);
    });
    return () => { vivo = false; };
  }, []);

  if (!patient) return null;

  return (
    <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }}>
      {open && (
        <DocModal
          doc={open} patient={patient} clinica={clinica} nombreDoctor={nombreDoctor}
          onClose={() => setOpen(null)} onGuardar={guardar} saved={guardados[open.id] || null}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap', background: '#faf8ff', border: `1px solid ${BD}`, padding: '10px 18px', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo_web.png" alt="Logo COP" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#5B2D8E', fontFamily: 'serif' }}>Consentimientos Informados</div>
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'serif' }}>Documentos digitales · Colegio Odontológico del Perú</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {sg > 0 && (
            <div style={{ background: MT, border: `1px solid ${BD}`, borderRadius: 10, padding: '6px 16px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: P, lineHeight: 1 }}>{sg}</div>
                <div style={{ fontSize: 9, color: P, fontWeight: 700 }}>FIRMADO{sg > 1 ? 'S' : ''}</div>
              </div>
              <div style={{ fontSize: 11, color: P }}>de {DOCS.length} disponibles</div>
            </div>
          )}
          {sg === 0 && (
            <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 10, padding: '6px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: MU }}>Ningún documento firmado aún</div>
            </div>
          )}
          {avatarUrl && <img src={avatarUrl} alt={nombreDoctor} style={{ width: 38, height: 38, objectFit: 'contain' }} />}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar documento…"
          style={{
            flex: '1 1 200px', minWidth: 160, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${BD}`, fontSize: 12, outline: 'none', color: DN,
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${cat === categoriaActiva ? (CATEGORIA_COLOR[cat] || P) : BD}`,
                background: cat === categoriaActiva ? (CATEGORIA_COLOR[cat] || P) : '#fff',
                color: cat === categoriaActiva ? '#fff' : '#666',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {sg > 0 && (
        <div style={{ marginBottom: 16, background: LT, border: `1px solid ${BD}`, borderRadius: 9, padding: '8px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: P }}>Documentos firmados en esta sesión</span>
            <span style={{ fontSize: 11, color: P, fontWeight: 700 }}>{sg} / {DOCS.length}</span>
          </div>
          <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(sg / DOCS.length) * 100}%`, background: WA, borderRadius: 3, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {Object.values(guardados).map((g, i) => (
              <span key={i} style={{ fontSize: 9, background: '#dcfce7', color: WA, padding: '2px 8px', borderRadius: 8, fontWeight: 700, border: '1px solid #86efac' }}>
                ✓ {g.titulo}
              </span>
            ))}
          </div>
        </div>
      )}

      {docsFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 10px', color: MU, fontSize: 12 }}>
          Ningún documento coincide con la búsqueda.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 11 }}>
        {docsFiltrados.map(c => {
          const g = guardados[c.id];
          const color = CATEGORIA_COLOR[c.categoria] || P;
          return (
            <div key={c.id} onClick={() => setOpen(c)}
              style={{
                background: '#fff', border: `1.5px solid ${g ? '#86efac' : `color-mix(in srgb, ${P} 20%, transparent)`}`, borderRadius: 11, padding: 14,
                cursor: 'pointer', transition: 'all .15s', position: 'relative', display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: g ? '0 2px 8px #86efac44' : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = g ? '#16a34a' : P; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${g ? '#86efac44' : `color-mix(in srgb, ${P} 13%, transparent)`}`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = g ? '#86efac' : `color-mix(in srgb, ${P} 20%, transparent)`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = g ? '0 2px 8px #86efac44' : 'none'; }}>

              {g && <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 900, boxShadow: `0 2px 6px color-mix(in srgb, ${WA} 27%, transparent)` }}>✓</div>}

              <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '1a', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="document" size={16} />
              </div>
              <div>
                <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: .3 }}>{c.categoria}</span>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: DN, lineHeight: 1.3, margin: '2px 0 3px', paddingRight: g ? 22 : 0 }}>{c.title}</div>
                <div style={{ fontSize: 9.5, color: '#888', lineHeight: 1.4 }}>{c.subtitle}</div>
              </div>

              {g ? (
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: 9.5, color: WA, fontWeight: 700 }}>Firmado: {g.fecha}</div>
                  <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>
                    {g.firmaP ? '✓ Paciente ' : ''}{g.firmaDr ? '· ✓ Odontólogo' : ''}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 10, color: P, fontWeight: 700 }}>Ver / reimprimir →</div>
                </div>
              ) : (
                <div style={{ marginTop: 'auto', background: P, color: '#fff', padding: '5px 10px', borderRadius: 6, textAlign: 'center', fontSize: 10.5, fontWeight: 700 }}>
                  Abrir documento →
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '9px 13px', background: LT, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 10, color: '#666', lineHeight: 1.7, fontFamily: 'serif' }}>
        <strong style={{ color: P }}>Flujo recomendado:</strong> Seleccionar el consentimiento del procedimiento → El paciente lee en pantalla → Completar campos punteados (DNI, domicilio) → Firmar digitalmente → Guardar → Imprimir copia para el paciente.
      </div>
    </div>
  );
}