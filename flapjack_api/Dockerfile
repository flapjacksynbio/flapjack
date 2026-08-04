# 3.8 is the lowest version with binary wheels for cvxopt on both x86_64 and
# aarch64. On 3.7 pip falls back to the sdist and compiles it from source,
# which is what previously required the numerical -dev libraries below and the
# linux/amd64 platform pin. Django 3.0 supports up to 3.8.
FROM python:3.8
ENV PYTHONUNBUFFERED 1

# postgresql-client supplies libpq for psycopg2, which still builds from source.
# The LAPACK/BLAS/SuiteSparse/GLPK/GSL/FFTW packages that used to be here were
# only needed to compile cvxopt; it now installs as a wheel.
RUN apt-get -y update && apt-get -y install postgresql-client

RUN mkdir -p /var/app/flap
WORKDIR /var/app/flap

# Allows docker to cache installed dependencies between builds
COPY ./requirements.txt .
RUN pip install -r requirements.txt

# Adds application code to the image
COPY . .

EXPOSE 8000
