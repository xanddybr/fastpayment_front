export const getDayName = (dateString: string): string => {
  const capitalize = (s: string) => s && s[0].toUpperCase() + s.slice(1);
  return capitalize(new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long' }));
};

export const formatDateTime = (d: string): string =>
  new Date(d.replace(/-/g, '/')).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatScheduleWindow = (scheduledAt: string, durationMinutes: string | number) => {
  const dataFormatada = scheduledAt.replace(/-/g, '/');
  const dataInicio = new Date(dataFormatada);
  const duracao = parseInt(String(durationMinutes), 10) || 0;
  const dataFim = new Date(dataInicio.getTime() + duracao * 60000);
  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return {
    dataInicio,
    dataFim,
    horaInicio,
    horaFim,
    horarioExibicao: duracao > 0 ? `${horaInicio}h às ${horaFim}h` : `${horaInicio}h`,
  };
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
};

export const getScheduleSummary = (item: { event_name: string; scheduled_at: string; event_price: string | number }) => {
  const dataFormatada = item.scheduled_at?.replace(/-/g, '/');
  const dataInicio = dataFormatada ? new Date(dataFormatada) : null;
  const dateLabel = dataInicio
    ? `${dataInicio.toLocaleDateString('pt-BR')} às ${dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`
    : '';
  return `${item.event_name} - ${dateLabel} - R$ ${parseFloat(String(item.event_price)).toFixed(2)}`;
};

export const validateFullName = (name: string): boolean => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.every((p) => p.length >= 2);
};
